import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/sentence/tokenize';
import { createPuzzle } from '../src/puzzle/create-puzzle';
import { encodeSentence, decodeSentence } from '../src/sharing/sentence-url';
import { gradeGuess } from '../src/grading/grade-guess';
import type { WordEmbedder } from '../src/embedding/word-embedder';

class FakeEmbedder implements WordEmbedder {
  async embedWords(words: readonly string[]): Promise<ReadonlyMap<string, Float32Array>> {
    const vectors: Record<string, number[]> = { alpha: [1, 0], beta: [0, 1], gamma: [0.9, 0.1] };
    return new Map(words.map(word => [word, new Float32Array(vectors[word] ?? [0, 0])]));
  }
}
describe('sentence behavior', () => {
  it('normalizes punctuation, apostrophes, and hyphens', () => expect(tokenize("GOD’s God-given, earth!").map(t => t.normalized)).toEqual(["god's", 'god-given', 'earth']));
  it('creates a word-counted puzzle', () => expect(createPuzzle('Hello, bright world!').wordCount).toBe(3));
  it('round trips unicode shared sentences', () => { const sentence = 'Café’s light ✨—today'; expect(decodeSentence(encodeSentence(sentence))).toBe(sentence); });
  it('grades every guess against its best reusable target match', async () => {
    const result = await gradeGuess(createPuzzle('alpha beta'), 'gamma gamma', new FakeEmbedder());
    expect(result.feedback.map(item => item.category)).toEqual(['very-close', 'very-close']);
    expect(result.feedback.map(item => item.position)).toEqual(['right', 'wrong']);
    expect(result.won).toBe(false);
  });
  it('reports an exact word in the wrong position without consuming it', async () => {
    const result = await gradeGuess(createPuzzle('alpha beta'), 'beta alpha', new FakeEmbedder());
    expect(result.feedback.every(item => item.category === 'exact')).toBe(true);
    expect(result.feedback.every(item => item.position === 'wrong')).toBe(true);
    expect(result.won).toBe(false);
  });
});
