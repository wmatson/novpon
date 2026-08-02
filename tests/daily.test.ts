import { describe, expect, it } from 'vitest';
import { deriveDailySeed, DrandDailyEntropy, firstRoundAtOrAfterMidnight, type DailyEntropySource } from '../src/daily/daily-entropy';

describe('daily drand entropy', () => {
  it('chooses the first round at or after UTC midnight', () => {
    const chain = { genesis_time: 0, period: 3 };
    expect(firstRoundAtOrAfterMidnight('1970-01-01', chain)).toBe(1);
    expect(firstRoundAtOrAfterMidnight('1970-01-01', { genesis_time: -1, period: 3 })).toBe(2);
  });
  it('derives deterministic domain-separated seed bytes', async () => {
    const hash = await deriveDailySeed('2025-01-02', '00'.repeat(32));
    expect(hash).toHaveLength(32);
    expect([...hash.slice(0, 4)]).toEqual([145, 23, 101, 220]);
  });
  it('retries the exact target round and never substitutes local entropy', async () => {
    let calls = 0; const client = { info: async () => ({ genesis_time: 0, period: 3, public_key: '', hash: '', groupHash: '', schemeID: '', metadata: { beaconID: '' } }), beacon: async (round: number) => { calls += 1; if (calls < 2) throw new Error('not emitted'); return { round, randomness: '00'.repeat(32) }; } };
    const sleep = async () => undefined;
    const source: DailyEntropySource = new DrandDailyEntropy(client, sleep);
    expect(await source.entropyForDate('1970-01-01')).toHaveLength(32);
    expect(calls).toBe(2);
  });
});
