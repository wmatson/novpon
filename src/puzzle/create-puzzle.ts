import { tokenize } from '../sentence/tokenize';
import type { Puzzle } from './types';

export function createPuzzle(sentence: string): Puzzle {
  const targetText = sentence.normalize('NFC').trim();
  const targetTokens = tokenize(targetText);
  if (!targetTokens.length) throw new Error('A puzzle sentence must contain at least one recognized word.');
  return { targetText, targetTokens, wordCount: targetTokens.length };
}
