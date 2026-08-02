export const SEMANTIC_THRESHOLDS = { far: 0.30, close: 0.50, veryClose: 0.70 } as const;
export function roundSimilarity(value: number): number { return Math.round(value * 1_000_000) / 1_000_000; }
export function categoryFor(similarity: number): 'very-close' | 'close' | 'far' | 'no-match' {
  if (similarity >= SEMANTIC_THRESHOLDS.veryClose) return 'very-close';
  if (similarity >= SEMANTIC_THRESHOLDS.close) return 'close';
  if (similarity >= SEMANTIC_THRESHOLDS.far) return 'far';
  return 'no-match';
}
