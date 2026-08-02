import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve('.');
const corpusPath = join(root, 'public/data/dra-corpus.json');
const report = JSON.parse(await readFile(join(root, 'public/data/dra-corpus-report.json'), 'utf8')) as { sha256: string; includedVerseCount: number };
const corpus = await readFile(corpusPath);
const digest = createHash('sha256').update(corpus).digest('hex');
if (digest !== report.sha256) throw new Error(`Corpus checksum mismatch: ${digest}`);
const entries = JSON.parse(corpus.toString()) as Array<{ id: string; text: string; source: { book: string; chapter: number; verse: number } }>;
if (entries.length !== report.includedVerseCount) throw new Error('Corpus report count does not match the artifact.');
if (entries.some(entry => [...entry.text].length > 250 || !entry.source || !entry.id)) throw new Error('Corpus invariant failed.');
for (const file of ['config.json', 'special_tokens_map.json', 'tokenizer.json', 'tokenizer_config.json', 'vocab.txt', 'onnx/model_quantized.onnx']) await stat(join(root, 'public/models/Xenova/all-MiniLM-L6-v2', file));
console.log({ corpusEntries: entries.length, corpusSha256: digest, modelAssets: 'present' });
