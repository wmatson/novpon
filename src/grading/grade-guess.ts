import { tokenize } from '../sentence/tokenize';
import { cosineSimilarity, DeterministicWordEmbedder, type WordEmbedder } from '../embedding/word-embedder';
import { categoryFor, roundSimilarity } from './thresholds';
import type { GradeResult, Position } from './types';
import type { Puzzle } from '../puzzle/types';

export async function gradeGuess(puzzle: Puzzle, guess: string, embedder: WordEmbedder = new DeterministicWordEmbedder()): Promise<GradeResult> {
  const guessTokens = tokenize(guess);
  if (guessTokens.length !== puzzle.wordCount) return { feedback: [], won: false, lengthError: `Your guess needs exactly ${puzzle.wordCount} words.` };
  const words = [...new Set([...guessTokens, ...puzzle.targetTokens].map(token => token.normalized))];
  const vectors = await embedder.embedWords(words);
  const feedback = guessTokens.map((token, index) => {
    const target = puzzle.targetTokens[index];
    if (token.normalized === target.normalized) return { guess: token.surface, category: 'exact' as const, position: 'right' as const, similarity: 1 };
    const guessVector = vectors.get(token.normalized); const targetVector = vectors.get(target.normalized);
    const similarity = roundSimilarity(guessVector && targetVector ? cosineSimilarity(guessVector, targetVector) : 0);
    const category = categoryFor(similarity);
    return { guess: token.surface, category, position: (category === 'no-match' ? null : 'wrong') as Position, similarity };
  });
  return { feedback, won: feedback.every(item => item.category === 'exact') };
}
