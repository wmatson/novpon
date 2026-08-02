export interface DailyEntropySource { entropyForDate(date: string): Promise<Uint8Array>; }
export class LocalDailyEntropy implements DailyEntropySource {
  async entropyForDate(date: string): Promise<Uint8Array> { return new TextEncoder().encode(`novpon-daily:${date}`); }
}
