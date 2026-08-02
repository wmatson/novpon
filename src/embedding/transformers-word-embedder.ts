import { pipeline } from '@huggingface/transformers';
import type { WordEmbedder } from './word-embedder';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
type Extractor = (texts: string[], options: { pooling: 'mean'; normalize: true }) => Promise<{ tolist(): unknown }>;
let extractorPromise: Promise<Extractor> | undefined;

async function getExtractor(): Promise<Extractor> {
  extractorPromise ??= pipeline('feature-extraction', MODEL_ID, { dtype: 'q8' }) as unknown as Promise<Extractor>;
  return extractorPromise;
}

export class TransformersWordEmbedder implements WordEmbedder {
  async embedWords(normalizedWords: readonly string[]): Promise<ReadonlyMap<string, Float32Array>> {
    if (!normalizedWords.length) return new Map();
    const extractor = await getExtractor();
    const output = await extractor([...normalizedWords], { pooling: 'mean', normalize: true });
    const rows = output.tolist() as number[][];
    return new Map(rows.map((row, index) => [normalizedWords[index], new Float32Array(row)]));
  }
}
