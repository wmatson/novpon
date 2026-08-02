# Novpon

Novpon is a mobile-first, client-side semantic sentence guessing game. Guesses may contain any number of words so players can explore longer targets; only a complete exact sentence in the correct order wins. Words are graded as exact, wrong position, very close, close, or no match.

Play it live at [wmatson.github.io/novpon](https://wmatson.github.io/novpon/).

## Modes

- **Daily puzzle** — deterministic UTC-day entry point.
- **Random verse** — browser entropy selects a verse from the static DRA corpus. Use **Share this verse** to create a `/random/<corpus-entry-id>` link for that exact instance; visiting `/random` itself always draws a fresh verse, including after refresh.
- **Make a puzzle** — encode any sentence (up to 250 Unicode code points) into a shareable `#/p/<base64url>` link.

Daily and Random Verse games reveal the Bible book as a pre-solve hint. Manual puzzles can include an optional hint; when present, it is carried as an additional URL-safe Base64 `h` fragment parameter.

## Development

```bash
npm install
npm run dev
npm test
npm run build
npm run calibrate
npm run benchmark
npm run benchmark:transformers
```

The app is a Vite + Preact + TypeScript static site. Hash routing keeps it compatible with GitHub Pages, and `.github/workflows/pages.yml` builds and deploys `dist` on pushes to `main`.

## Forking for another corpus

Novpon does not require a backend or a live corpus service. A fork can replace the checked-in static corpus and deploy the result as an ordinary GitHub Pages site.

1. Fork and clone the repository, then install dependencies with `npm install`.
2. Replace `public/data/dra-corpus.json` with a JSON array of sentence records. Each record should have stable `id` and `text` fields plus source metadata, for example:

   ```json
   {
     "id": "chapter-1-sentence-1",
     "text": "A sentence from the replacement corpus.",
     "source": { "book": "My Collection", "chapter": 1, "verse": 1 }
   }
   ```

   Keep the existing limits: sentence text must be at most 250 Unicode code points and contain at least one recognized word. Preserve a deterministic record order so daily selection remains reproducible.
3. Update or replace `scripts/build-dra-corpus.ts` if the source needs different parsing. The DRA builder is only a convenience for the pinned Bible input; a different corpus may use its own importer that emits the same JSON shape.
4. Update `public/data/dra-corpus-report.json` or adapt `scripts/validate-assets.ts` to validate the new corpus. Run `npm run validate:assets` and `npm run build` before deploying.
5. For non-Bible metadata, change the `Bible book` hint label in `src/app/App.tsx` to match the meaning of `source.book`. Manual puzzles and the semantic grading code do not need to change.

The corpus is loaded lazily by Random Verse and Daily mode from `public/data/dra-corpus.json`; no upstream corpus URL is needed at runtime. The bundled embedding model in `public/models` can be reused as-is, or replaced by following the model-vendoring workflow in `scripts/vendor-model.ts` and updating the worker configuration if the replacement model has different dimensions or runtime requirements.

## Architecture

The implementation keeps the plan's seams explicit: `createPuzzle(sentence)` knows only about sentence text; `selectSentence(corpus, entropy)` is deterministic and receives its entropy from the caller; and grading consumes a `WordEmbedder` interface. Sentence tokenization uses Unicode-aware word recognition with NFKC normalization, NFC display text, preserved internal apostrophes/hyphens, and no stop-word handling.

The checked-in DRA corpus is generated from `janvier-s/original-douay-rheims` revision `0bf4218b9b46b5b00d29a703b5b74226051b97a5a` by `scripts/build-dra-corpus.ts`. The current curated artifact contains 5,689 eligible verses: all of Psalms, Proverbs, Sirach, Wisdom, and Ecclesiastes, plus 17 famous verses from other books. It excludes 1,175 overlength verses and 30,283 verses outside the curation, and records its SHA-256 digest in `public/data/dra-corpus-report.json`. To regenerate it, check out the pinned revision and run `DRA_SOURCE_DIR=/path/to/bible/raw npm run build:corpus`.

Random and daily modes lazy-load the corpus from `public/data` so the 9 MB data file does not inflate the initial JavaScript bundle. The app uses the pinned local `Xenova/all-MiniLM-L6-v2` model through a Web Worker: WebGPU is attempted first, then WASM is used as a compatibility fallback. Model files are vendored into `public/models` and validated by `npm run validate:assets`.

Daily puzzles use verified League of Entropy quicknet beacons through `drand-client`. The implementation requests the first round at or after UTC midnight, derives a domain-separated SHA-256 seed, retries briefly when the round has not emitted, and never substitutes local entropy.

Similarity handling was benchmarked over 1,000 curated corpus verses and 18,267 randomized comparisons. The selected `best-reusable` strategy independently chooses the matchiest target for every guess word, without consuming target words. It produced 58 exact, 9,575 very-close, 2,620 close, and 6,014 no-match results with the current thresholds. The benchmark compares this with same-index and target-consuming exclusive matching; reports are checked in under `benchmarks/`.

Browser-flow tests cover the menu, custom puzzle creation, random launch, live word counting, and 320px layout through Playwright. Run them with `npm run test:e2e`.

## Why “Novpon”?

The name was generated by applying a simple phoneme substitution to the English pronunciation of “sentence.” It retains a subtle relationship to the game's core concept while remaining distinctive and not directly descriptive.
