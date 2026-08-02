export interface WordEmbedder { embedWords(normalizedWords: readonly string[]): Promise<ReadonlyMap<string, Float32Array>>; }

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) { dot += a[i] * b[i]; aa += a[i] * a[i]; bb += b[i] * b[i]; }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

// A deterministic local fallback keeps the game playable while the optional model loads.
export class DeterministicWordEmbedder implements WordEmbedder {
  async embedWords(words: readonly string[]): Promise<ReadonlyMap<string, Float32Array>> {
    return new Map(words.map(word => [word, this.vector(word)]));
  }
  private vector(word: string): Float32Array {
    const out = new Float32Array(24);
    for (let i = 0; i < word.length; i += 1) out[(word.charCodeAt(i) * 7 + i * 13) % out.length] += 1 / (i + 1);
    return out;
  }
}
