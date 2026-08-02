import corpus from '../public/data/dra-corpus.json';
import { DeterministicWordEmbedder, cosineSimilarity } from '../src/embedding/word-embedder';
import { categoryFor } from '../src/grading/thresholds';
import { tokenize } from '../src/sentence/tokenize';

const extraWords = 'the a and of to in for with from as all one new people child called give know see come go bright quiet river mountain house day night water land heart shall will are is not world love light peace kingdom blessed make made good great man woman son father spirit life truth word'.split(' ');
const words = [...new Set([...corpus.flatMap(entry => tokenize(entry.text).map(token => token.normalized)), ...extraWords])];
const embedder = new DeterministicWordEmbedder();
const vectors = await embedder.embedWords(words);
const counts = { 'very-close': 0, close: 0, far: 0, 'no-match': 0 };
const similarities: number[] = [];
for (const target of words) {
  for (const guess of words) {
    if (guess === target) continue;
    const similarity = Math.round(cosineSimilarity(vectors.get(target)!, vectors.get(guess)!) * 1_000_000) / 1_000_000;
    similarities.push(similarity);
    counts[categoryFor(similarity)] += 1;
  }
}
similarities.sort((a, b) => a - b);
const quantile = (value: number) => similarities[Math.floor((similarities.length - 1) * value)];
console.log({ words: words.length, comparisons: similarities.length, counts, quantiles: { p10: quantile(.1), p25: quantile(.25), p50: quantile(.5), p75: quantile(.75), p90: quantile(.9), p95: quantile(.95) } });
