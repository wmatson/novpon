import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const REVISION = '0bf4218b9b46b5b00d29a703b5b74226051b97a5a';
const sourceDir = resolve(process.env.DRA_SOURCE_DIR ?? '.cache/dra-raw');
const outputDir = resolve('public/data');

// This order is part of the corpus contract. Filesystem enumeration is never used.
const BOOK_ORDER = [
  'genesis', 'exodus', 'leviticus', 'numbers', 'deuteronomy', 'josue', 'judges', 'ruth',
  '1-kings', '2-kings', '3-kings', '4-kings', '1-paralipomenon', '2-paralipomenon',
  '1-esdras', '2-esdras', 'tobias', 'judith', 'esther', 'job', 'psalms', 'proverbs',
  'ecclesiastes', 'canticle-of-canticles', 'wisdom', 'ecclesiasticus', 'isaie', 'jeremie',
  'lamentations', 'baruch', 'ezechiel', 'daniel', 'osee', 'joel', 'amos', 'abdias', 'jonas',
  'micheas', 'nahum', 'habacuc', 'sophonias', 'aggeus', 'zacharias', 'malachie',
  'matthew', 'mark', 'luke', 'john', 'acts', 'romans', '1-corinthians', '2-corinthians',
  'galatians', 'ephesians', 'philippians', 'colossians', '1-thessalonians', '2-thessalonians',
  '1-timothy', '2-timothy', 'titus', 'philemon', 'hebrews', 'james', '1-peter', '2-peter',
  '1-john', '2-john', '3-john', 'jude', 'apocalypse', '3-esdras', '4-esdras',
  '1-machabees', '2-machabees', 'prayer-of-manasses', 'prayer-of-manasseh',
];

interface SourceBook { book: string; short_title?: string; book_title?: string; chapters: Array<{ chapter: number; verses: Array<{ verse: number; text: string }> }> }
interface CorpusEntry { id: string; text: string; source: { book: string; chapter: number; verse: number } }

function decodeEntities(text: string): string {
  const named: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', nbsp: ' ', quot: '"' };
  return text.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (full, decimal, hex, name) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(Number.parseInt(hex, 16));
    return named[name.toLowerCase()] ?? full;
  });
}

function cleanText(raw: string): string {
  return decodeEntities(raw
    .replace(/<\/?(?:sc|i)>/gi, '')
    .replace(/<(?:cr|na|mn)>[\s\S]*?<\/(?:cr|na|mn)>/gi, '')
    .replace(/<br\s*\/?\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')).normalize('NFC').trim();
}

function hasWord(text: string): boolean { return /[\p{L}\p{M}\p{N}]+/u.test(text); }

const entries: CorpusEntry[] = [];
let excludedOverlengthCount = 0;
let malformedEntryCount = 0;
for (const slug of BOOK_ORDER) {
  const book = JSON.parse(await readFile(join(sourceDir, `${slug}.json`), 'utf8')) as SourceBook;
  if (!book || !Array.isArray(book.chapters)) throw new Error(`Malformed book: ${slug}`);
  const bookName = book.short_title ?? book.book_title?.split(',')[0] ?? slug;
  for (const chapter of book.chapters) {
    if (!Number.isInteger(chapter.chapter) || !Array.isArray(chapter.verses)) throw new Error(`Malformed chapter in ${slug}`);
    for (const verse of chapter.verses) {
      if (!Number.isInteger(verse.verse) || typeof verse.text !== 'string') { malformedEntryCount += 1; throw new Error(`Malformed verse in ${slug}:${chapter.chapter}`); }
      const text = cleanText(verse.text);
      if ([...text].length > 250) { excludedOverlengthCount += 1; continue; }
      if (!text || !hasWord(text)) { malformedEntryCount += 1; throw new Error(`Empty or wordless verse in ${slug}:${chapter.chapter}:${verse.verse}`); }
      entries.push({ id: `${slug}:${chapter.chapter}:${verse.verse}`, text, source: { book: bookName, chapter: chapter.chapter, verse: verse.verse } });
    }
  }
}

const corpus = `${JSON.stringify(entries, null, 2)}\n`;
const digest = createHash('sha256').update(corpus).digest('hex');
await mkdir(outputDir, { recursive: true });
await writeFile(join(outputDir, 'dra-corpus.json'), corpus);
await writeFile(join(outputDir, 'dra-corpus-report.json'), `${JSON.stringify({ upstreamRepository: 'janvier-s/original-douay-rheims', upstreamRevision: REVISION, includedVerseCount: entries.length, excludedOverlengthCount, malformedEntryCount, sha256: digest }, null, 2)}\n`);
console.log({ includedVerseCount: entries.length, excludedOverlengthCount, malformedEntryCount, sha256: digest });
