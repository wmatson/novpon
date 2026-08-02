import { TransformersWordEmbedder } from './transformers-word-embedder';

type Request = { id: number; type: 'load' } | { id: number; type: 'embed'; words: string[] };
type Response = { id: number; type: 'ready'; backend: 'webgpu' | 'wasm' } | { id: number; type: 'embeddings'; vectors: Array<[string, number[]]> } | { id: number; type: 'error'; message: string };

let embedder: TransformersWordEmbedder | undefined;
let backend: 'webgpu' | 'wasm' | undefined;

function reply(message: Response): void { self.postMessage(message); }

self.onmessage = async (event: MessageEvent<Request>) => {
  const request = event.data;
  try {
    if (request.type === 'load') {
      const gpu = (self.navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
      const adapter = gpu ? await gpu.requestAdapter() : null;
      try {
        if (!adapter) throw new Error('WebGPU adapter unavailable.');
        embedder = new TransformersWordEmbedder('webgpu');
        await embedder.embedWords(['the']);
        backend = 'webgpu';
      } catch {
        embedder = new TransformersWordEmbedder('wasm');
        await embedder.embedWords(['the']);
        backend = 'wasm';
      }
      reply({ id: request.id, type: 'ready', backend });
      return;
    }
    if (!embedder || !backend) throw new Error('Embedding worker is not initialized.');
    let vectors: ReadonlyMap<string, Float32Array>;
    try {
      vectors = await embedder.embedWords(request.words);
    } catch (error) {
      if (backend !== 'webgpu') throw error;
      embedder = new TransformersWordEmbedder('wasm');
      backend = 'wasm';
      vectors = await embedder.embedWords(request.words);
    }
    reply({ id: request.id, type: 'embeddings', vectors: [...vectors.entries()].map(([word, vector]) => [word, [...vector]]) });
  } catch (error) {
    reply({ id: request.id, type: 'error', message: error instanceof Error ? error.message : 'Embedding failed.' });
  }
};
