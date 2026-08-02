import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isCuratedCorpusEntry } from '../src/corpus/curated';

const corpusPath = resolve('public/data/dra-corpus.json');
const reportPath = resolve('public/data/dra-corpus-report.json');
const corpus = JSON.parse(await readFile(corpusPath, 'utf8')) as Array<{ id: string; text: string; source: { book: string; chapter: number; verse: number } }>;
const curated = corpus.filter(isCuratedCorpusEntry);
const corpusText = `${JSON.stringify(curated, null, 2)}\n`;
const report = JSON.parse(await readFile(reportPath, 'utf8')) as Record<string, unknown>;
report.includedVerseCount = curated.length;
report.excludedByCurationCount = corpus.length - curated.length;
report.sha256 = createHash('sha256').update(corpusText).digest('hex');
await writeFile(corpusPath, corpusText);
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log({ includedVerseCount: curated.length, excludedByCurationCount: corpus.length - curated.length, sha256: report.sha256 });
