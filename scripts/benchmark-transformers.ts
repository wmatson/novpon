import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pipeline } from '@huggingface/transformers';
import corpus from '../public/data/dra-corpus.json';
import { cosineSimilarity } from '../src/embedding/word-embedder';
import { categoryFor, roundSimilarity } from '../src/grading/thresholds';
import { tokenize } from '../src/sentence/tokenize';

type Mode = 'same-index' | 'best-reusable' | 'best-exclusive';
const SAMPLE_SIZE = 500;
const BATCH_SIZE = 128;
let randomState = 0x9e3779b9;
function randomIndex(length: number): number { randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0; return randomState % length; }
function words(text: string): string[] { return tokenize(text).map(token => token.normalized); }

const targets = corpus.slice(0, SAMPLE_SIZE).map(entry => words(entry.text)).filter(target => target.length > 1);
const vocabulary = [...new Set(corpus.flatMap(entry => words(entry.text)))];
const guessSets = targets.map(target => target.map(() => vocabulary[randomIndex(vocabulary.length)]));
const extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { dtype: 'q8' });
const vectors = new Map<string, Float32Array>();
for (let offset = 0; offset < vocabulary.length; offset += BATCH_SIZE) {
  const batch = vocabulary.slice(offset, offset + BATCH_SIZE);
  const output = await extractor(batch, { pooling: 'mean', normalize: true });
  const rows = output.tolist() as number[][];
  rows.forEach((row, index) => vectors.set(batch[index], new Float32Array(row)));
}
const results = Object.fromEntries((['same-index', 'best-reusable', 'best-exclusive'] as Mode[]).map(mode => [mode, { comparisons: 0, exact: 0, veryClose: 0, close: 0, far: 0, noMatch: 0, rightPosition: 0, wrongPosition: 0 }])) as Record<Mode, { comparisons: number; exact: number; veryClose: number; close: number; far: number; noMatch: number; rightPosition: number; wrongPosition: number }>;

for (let sample = 0; sample < targets.length; sample += 1) {
  const target = targets[sample]; const guess = guessSets[sample];
  for (const mode of Object.keys(results) as Mode[]) {
    const available = new Set(target.map((_, index) => index));
    guess.forEach((guessWord, index) => {
      const candidateIndices = mode === 'same-index' ? [index] : [...(mode === 'best-exclusive' ? available : target.map((_, targetIndex) => targetIndex))];
      let bestTargetIndex = candidateIndices[0]; let bestSimilarity = -1;
      for (const targetIndex of candidateIndices) {
        const similarity = cosineSimilarity(vectors.get(guessWord)!, vectors.get(target[targetIndex])!);
        if (similarity > bestSimilarity) { bestSimilarity = similarity; bestTargetIndex = targetIndex; }
      }
      const rounded = roundSimilarity(bestSimilarity); const category = guessWord === target[bestTargetIndex] ? 'exact' : categoryFor(rounded); results[mode].comparisons += 1;
      if (category === 'exact') results[mode].exact += 1;
      else if (category === 'very-close') results[mode].veryClose += 1;
      else if (category === 'close') results[mode].close += 1;
      else if (category === 'far') results[mode].far += 1;
      else results[mode].noMatch += 1;
      if (bestTargetIndex === index) results[mode].rightPosition += 1; else results[mode].wrongPosition += 1;
      if (mode === 'best-exclusive') available.delete(bestTargetIndex);
    });
  }
}
const report = { sampleSize: targets.length, vocabularySize: vocabulary.length, model: 'Xenova/all-MiniLM-L6-v2', thresholds: { far: .25, close: .45, veryClose: .65 }, modes: results };
await mkdir(resolve('benchmarks'), { recursive: true });
await writeFile(resolve('benchmarks/similarity-benchmark-transformers.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(report);
