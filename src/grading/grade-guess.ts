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
    const guessVector = vectors.get(token.normalized);
    let bestTargetIndex = 0;
    let bestSimilarity = -Infinity;
    puzzle.targetTokens.forEach((target, targetIndex) => {
      const targetVector = vectors.get(target.normalized);
      const similarity = guessVector && targetVector ? cosineSimilarity(guessVector, targetVector) : 0;
      // Ties prefer the same position, then the earliest target. Targets are
      // intentionally reusable: each guess is graded independently.
      if (similarity > bestSimilarity || (similarity === bestSimilarity && targetIndex === index)) {
        bestSimilarity = similarity;
        bestTargetIndex = targetIndex;
      }
    });
    const target = puzzle.targetTokens[bestTargetIndex];
    const similarity = roundSimilarity(bestSimilarity);
    if (token.normalized === target.normalized) {
      return { guess: token.surface, category: 'exact' as const, position: (bestTargetIndex === index ? 'right' : 'wrong') as Position, similarity: 1 };
    }
    const category = categoryFor(similarity);
    return { guess: token.surface, category, position: (category === 'no-match' ? null : bestTargetIndex === index ? 'right' : 'wrong') as Position, similarity };
  });
  return { feedback, won: feedback.every(item => item.category === 'exact' && item.position === 'right') };
}
