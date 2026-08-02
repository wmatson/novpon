import { describe, expect, it } from 'vitest';
import { tokenize } from '../src/sentence/tokenize';
import { createPuzzle } from '../src/puzzle/create-puzzle';
import { encodeSentence, decodeSentence } from '../src/sharing/sentence-url';
describe('sentence behavior', () => {
  it('normalizes punctuation, apostrophes, and hyphens', () => expect(tokenize("GOD’s God-given, earth!").map(t => t.normalized)).toEqual(["god's", 'god-given', 'earth']));
  it('creates a word-counted puzzle', () => expect(createPuzzle('Hello, bright world!').wordCount).toBe(3));
  it('round trips unicode shared sentences', () => { const sentence = 'Café’s light ✨—today'; expect(decodeSentence(encodeSentence(sentence))).toBe(sentence); });
});
