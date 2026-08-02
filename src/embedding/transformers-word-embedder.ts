import { env, pipeline } from '@huggingface/transformers';
import type { WordEmbedder } from './word-embedder';

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';
type Extractor = (texts: string[], options: { pooling: 'mean'; normalize: true }) => Promise<{ tolist(): unknown }>;
type Backend = 'webgpu' | 'wasm';
const extractorPromises = new Map<Backend, Promise<Extractor>>();

env.allowLocalModels = true;
env.allowRemoteModels = false;
const assetUrl = (folder: string) => new URL(`${import.meta.env.BASE_URL}${folder}`, globalThis.location?.origin ?? 'http://localhost').href;
env.localModelPath = assetUrl('models/');
env.backends.onnx.wasm!.wasmPaths = assetUrl('assets/');

async function getExtractor(backend: Backend): Promise<Extractor> {
  let promise = extractorPromises.get(backend);
  if (!promise) {
    promise = pipeline('feature-extraction', MODEL_ID, { dtype: 'q8', device: backend }) as unknown as Promise<Extractor>;
    extractorPromises.set(backend, promise);
  }
  return promise;
}

export class TransformersWordEmbedder implements WordEmbedder {
  constructor(private readonly backend: Backend = 'wasm') {}
  private readonly cache = new Map<string, Float32Array>();

  async embedWords(normalizedWords: readonly string[]): Promise<ReadonlyMap<string, Float32Array>> {
    if (!normalizedWords.length) return new Map();
    const uniqueWords = [...new Set(normalizedWords)];
    const missingWords = uniqueWords.filter(word => !this.cache.has(word));
    if (!missingWords.length) return new Map(uniqueWords.map(word => [word, this.cache.get(word)!]));
    const extractor = await getExtractor(this.backend);
    const output = await extractor(missingWords, { pooling: 'mean', normalize: true });
    const rows = output.tolist() as number[][];
    rows.forEach((row, index) => this.cache.set(missingWords[index], new Float32Array(row)));
    return new Map(uniqueWords.map(word => [word, this.cache.get(word)!]));
  }
}
