import type { CorpusEntry } from '../random/select-sentence';

export async function loadDraCorpus(baseUrl: string): Promise<readonly CorpusEntry[]> {
  const response = await fetch(`${baseUrl}data/dra-corpus.json`);
  if (!response.ok) throw new Error('Could not load the verse corpus.');
  const corpus = await response.json() as CorpusEntry[];
  if (!corpus.length) throw new Error('The verse corpus is empty.');
  return corpus;
}
