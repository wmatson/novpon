import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/sentence/tokenize';
import { createPuzzle } from '../src/puzzle/create-puzzle';
import { encodeSentence, decodeSentence, encodeCustomPuzzle, decodeHint } from '../src/sharing/sentence-url';
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
  it('round trips an optional shared hint', () => expect(decodeHint(encodeCustomPuzzle('Hello world', 'A gentle clue').split('?h=')[1])).toBe('A gentle clue'));
  it('grades every guess against its best reusable target match', async () => {
    const result = await gradeGuess(createPuzzle('alpha beta'), 'gamma gamma', new FakeEmbedder());
    expect(result.feedback.map(item => item.category)).toEqual(['very-close', 'very-close']);
    expect(result.feedback.map(item => item.position)).toEqual(['right', 'wrong']);
    expect(result.feedback.every(item => item.curve?.length === 2)).toBe(true);
    expect(result.feedback[0].curve?.[0]).toBeCloseTo(0.993884, 5);
    expect(result.feedback[0].curve?.[1]).toBeCloseTo(0.110432, 5);
    expect(result.won).toBe(false);
  });
  it('reports an exact word in the wrong position without consuming it', async () => {
    const result = await gradeGuess(createPuzzle('alpha beta'), 'beta alpha', new FakeEmbedder());
    expect(result.feedback.every(item => item.category === 'exact')).toBe(true);
    expect(result.feedback.every(item => item.position === 'wrong')).toBe(true);
    expect(result.feedback[0].curve).toEqual([0, 1]);
    expect(result.feedback[1].curve).toEqual([1, 0]);
    expect(result.won).toBe(false);
  });
  it('keeps exact-word curves distinct at their own target positions', async () => {
    const result = await gradeGuess(createPuzzle('The quick brown fox jumped over the lazy dog by the river'), 'The quick brown fox jumped over the lazy dog by the river', new FakeEmbedder());
    expect(result.feedback[0].curve?.[0]).toBe(1);
    expect(result.feedback[3].curve?.[3]).toBe(1);
    expect(result.feedback[0].curve).not.toEqual(result.feedback[3].curve);
  });
  it('accepts exploratory guesses with any non-empty word count', async () => {
    const result = await gradeGuess(createPuzzle('alpha beta'), 'gamma', new FakeEmbedder());
    expect(result.lengthError).toBeUndefined();
    expect(result.feedback).toHaveLength(1);
    expect(result.won).toBe(false);
  });
  it('consumes duplicate exact occurrences one-to-one', async () => {
    const result = await gradeGuess(createPuzzle('alpha alpha'), 'alpha alpha alpha', new FakeEmbedder());
    expect(result.feedback.slice(0, 2).every(item => item.category === 'exact')).toBe(true);
    expect(result.feedback[2].category).not.toBe('exact');
  });
});
