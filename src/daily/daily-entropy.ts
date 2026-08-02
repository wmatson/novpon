import type { ChainInfo } from 'drand-client';
import { createQuicknetClient, type DrandBeaconClient } from './drand-client';

export interface DailyEntropySource { entropyForDate(date: string): Promise<Uint8Array>; }
export type Sha256 = (input: Uint8Array) => Promise<Uint8Array>;
export type Sleep = (milliseconds: number) => Promise<void>;

export function firstRoundAtOrAfterMidnight(date: string, chain: Pick<ChainInfo, 'genesis_time' | 'period'>): number {
  const utcMidnightMs = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(utcMidnightMs)) throw new Error(`Invalid UTC date: ${date}`);
  const genesisMs = chain.genesis_time * 1000;
  const periodMs = chain.period * 1000;
  return Math.ceil((utcMidnightMs - genesisMs) / periodMs) + 1;
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^(?:[\da-f]{2})+$/i.test(hex)) throw new Error('drand returned invalid randomness bytes.');
  return Uint8Array.from(hex.match(/../g)!, pair => Number.parseInt(pair, 16));
}

const browserSha256: Sha256 = async input => new Uint8Array(await crypto.subtle.digest('SHA-256', input));
const browserSleep: Sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function deriveDailySeed(date: string, randomnessHex: string, sha256: Sha256 = browserSha256): Promise<Uint8Array> {
  const prefix = new TextEncoder().encode('semantic-sentence-wordle:daily\0');
  const dateBytes = new TextEncoder().encode(date);
  const randomness = hexToBytes(randomnessHex);
  const input = new Uint8Array(prefix.length + dateBytes.length + 1 + randomness.length);
  input.set(prefix); input.set(dateBytes, prefix.length); input[prefix.length + dateBytes.length] = 0; input.set(randomness, prefix.length + dateBytes.length + 1);
  return sha256(input);
}

export class DrandDailyEntropy implements DailyEntropySource {
  constructor(private readonly client: DrandBeaconClient = createQuicknetClient(), private readonly sleep: Sleep = browserSleep) {}

  async entropyForDate(date: string): Promise<Uint8Array> {
    const chain = await this.client.info();
    const round = firstRoundAtOrAfterMidnight(date, chain);
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const beacon = await this.client.beacon(round);
        if (beacon.round !== round) throw new Error(`drand returned round ${beacon.round}; expected ${round}.`);
        return deriveDailySeed(date, beacon.randomness);
      } catch (error) {
        lastError = error;
        if (attempt < 2) await this.sleep(500 * (attempt + 1));
      }
    }
    throw new Error(`Today's drand beacon is unavailable: ${lastError instanceof Error ? lastError.message : 'unknown error'}`);
  }
}
