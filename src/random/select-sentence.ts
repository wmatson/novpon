import { uniformIndex } from './uniform-index';
export interface CorpusEntry { readonly id: string; readonly text: string; readonly source?: { readonly book: string; readonly chapter: number; readonly verse: number }; }
export interface SentenceSelection { readonly entry: CorpusEntry; readonly corpusIndex: number; }
export async function selectSentence(corpus: readonly CorpusEntry[], entropy: Uint8Array): Promise<SentenceSelection> {
  const corpusIndex = await uniformIndex(corpus.length, entropy); return { entry: corpus[corpusIndex], corpusIndex };
}
