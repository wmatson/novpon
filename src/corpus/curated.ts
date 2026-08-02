import type { CorpusEntry } from '../random/select-sentence';

export const CURATED_BOOK_SLUGS = new Set(['psalms', 'proverbs', 'ecclesiasticus', 'wisdom', 'ecclesiastes']);

export const FAMOUS_VERSE_IDS = new Set([
  'genesis:1:1', 'numbers:6:24', 'deuteronomy:6:4', 'isaie:40:31', 'jeremie:29:11',
  'matthew:5:9', 'matthew:6:9', 'matthew:11:28', 'john:3:16', 'john:14:6',
  'romans:8:28', '1-corinthians:13:4', 'philippians:4:13', 'hebrews:11:1',
  'james:1:5', '1-john:4:8', 'apocalypse:21:4',
]);

export function isCuratedCorpusEntry(entry: Pick<CorpusEntry, 'id'>): boolean {
  return CURATED_BOOK_SLUGS.has(entry.id.split(':', 1)[0]) || FAMOUS_VERSE_IDS.has(entry.id);
}
