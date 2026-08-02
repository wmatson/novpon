import type { WordEmbedder } from './word-embedder';

type WorkerResponse = { id: number; type: 'ready'; backend: 'webgpu' | 'wasm' } | { id: number; type: 'embeddings'; vectors: Array<[string, number[]]> } | { id: number; type: 'error'; message: string };

export class WorkerWordEmbedder implements WordEmbedder {
  private readonly worker = new Worker(new URL('./embedding-worker.ts', import.meta.url), { type: 'module' });
  private readonly pending = new Map<number, { resolve: (value: ReadonlyMap<string, Float32Array>) => void; reject: (reason: Error) => void }>();
  private nextId = 1;
  private loading: Promise<void> | undefined;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const response = event.data; const pending = this.pending.get(response.id); if (!pending) return; this.pending.delete(response.id);
      if (response.type === 'error') pending.reject(new Error(response.message));
      else if (response.type === 'embeddings') pending.resolve(new Map(response.vectors.map(([word, vector]) => [word, new Float32Array(vector)])));
      else pending.resolve(new Map());
    };
  }

  load(): Promise<void> {
    if (!this.loading) {
      this.loading = new Promise((resolve, reject) => {
        const id = this.nextId++; this.pending.set(id, { resolve: () => resolve(), reject }); this.worker.postMessage({ id, type: 'load' });
      });
    }
    return this.loading;
  }

  async embedWords(words: readonly string[]): Promise<ReadonlyMap<string, Float32Array>> {
    await this.load();
    return new Promise((resolve, reject) => { const id = this.nextId++; this.pending.set(id, { resolve, reject }); this.worker.postMessage({ id, type: 'embed', words: [...new Set(words)] }); });
  }
}
