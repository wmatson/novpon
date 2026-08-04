import { tokenize } from '../sentence/tokenize';
import { cosineSimilarity, DeterministicWordEmbedder, type WordEmbedder } from '../embedding/word-embedder';
import { categoryFor, roundSimilarity } from './thresholds';
import type { Feedback, GradeResult, Position } from './types';
import type { Puzzle } from '../puzzle/types';

export async function gradeGuess(puzzle: Puzzle, guess: string, embedder: WordEmbedder = new DeterministicWordEmbedder()): Promise<GradeResult> {
  const guessTokens = tokenize(guess);
  if (!guessTokens.length) return { feedback: [], won: false, lengthError: 'Enter at least one word.' };

  const feedback: Array<Feedback | undefined> = Array.from({ length: guessTokens.length });
  const remainingTargets = new Set(puzzle.targetTokens.map((_, index) => index));
  const remainingGuesses = new Set(guessTokens.map((_, index) => index));

  // Exact matches are consumed one-to-one, including duplicate occurrences.
  guessTokens.forEach((token, index) => {
    if (token.normalized === puzzle.targetTokens[index]?.normalized) {
      feedback[index] = { guess: token.surface, category: 'exact', position: 'right', similarity: 1 };
      remainingGuesses.delete(index); remainingTargets.delete(index);
    }
  });
  for (const index of [...remainingGuesses]) {
    const targetIndex = [...remainingTargets].find(candidate => puzzle.targetTokens[candidate].normalized === guessTokens[index].normalized);
    if (targetIndex === undefined) continue;
    feedback[index] = { guess: guessTokens[index].surface, category: 'exact', position: 'wrong', similarity: 1 };
    remainingGuesses.delete(index); remainingTargets.delete(targetIndex);
  }

  const semanticTargets = [...remainingTargets];
  const words = [...new Set([...guessTokens, ...puzzle.targetTokens].map(token => token.normalized))];
  const vectors = await embedder.embedWords(words);
  for (const index of remainingGuesses) {
    const guessVector = vectors.get(guessTokens[index].normalized);
    let bestTargetIndex: number | undefined; let bestSimilarity = -Infinity;
    for (const targetIndex of semanticTargets) {
      const targetVector = vectors.get(puzzle.targetTokens[targetIndex].normalized);
      const similarity = guessVector && targetVector ? cosineSimilarity(guessVector, targetVector) : 0;
      if (similarity > bestSimilarity || (similarity === bestSimilarity && targetIndex === index)) { bestSimilarity = similarity; bestTargetIndex = targetIndex; }
    }
    if (bestTargetIndex === undefined) {
      feedback[index] = { guess: guessTokens[index].surface, category: 'no-match', position: null, similarity: 0 };
      continue;
    }
    const similarity = roundSimilarity(bestSimilarity); const category = categoryFor(similarity);
    feedback[index] = { guess: guessTokens[index].surface, category, position: (category === 'no-match' ? null : bestTargetIndex === index ? 'right' : 'wrong') as Position, similarity };
  }
  const ordered = (feedback as Feedback[]).map((item, index) => ({
    ...item,
    curve: puzzle.targetTokens.map(targetToken => {
      if (targetToken.normalized === guessTokens[index].normalized) return 1;
      const guessVector = vectors.get(guessTokens[index].normalized);
      const targetVector = vectors.get(targetToken.normalized);
      return roundSimilarity(guessVector && targetVector ? cosineSimilarity(guessVector, targetVector) : 0);
    }),
  }));
  return { feedback: ordered, won: guessTokens.length === puzzle.wordCount && ordered.every(item => item.category === 'exact' && item.position === 'right') };
}
