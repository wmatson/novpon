import type { WordToken } from './types';

const WORD = /[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu;

export function tokenize(sentence: string): WordToken[] {
  const normalized = sentence.normalize('NFKC');
  return [...normalized.matchAll(WORD)].map((match, index) => {
    const surface = match[0];
    return { index, surface, normalized: normalizeWord(surface) };
  });
}

export function normalizeWord(word: string): string {
  return word.normalize('NFKC').replaceAll('’', "'").toLocaleLowerCase('en-US');
}
