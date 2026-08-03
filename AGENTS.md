# Novpon contributor guidance

## Project shape

Novpon is a client-side Preact application built with Vite and TypeScript. Hash routing keeps the static site compatible with GitHub Pages. The main UI and route-driven game lifecycle live in `src/app/App.tsx`; domain logic is grouped under `src/` by concern:

- `src/puzzle` creates validated puzzle values.
- `src/grading` grades guesses through the `WordEmbedder` interface.
- `src/daily` provides deterministic UTC-day entropy.
- `src/random` selects corpus entries from the checked-in static data.
- `src/sharing` encodes and decodes shareable hash routes.
- `src/embedding` owns the worker-backed semantic model.

Keep browser-only concerns such as local storage and navigation at the application boundary or in small, guarded modules. Preserve the pure seams (`createPuzzle`, sentence tokenization, deterministic selection, and grading interfaces) when changing game behavior.

## Commands

- `npm test` runs the Vitest unit suite.
- `npm run build` type-checks and builds the Vite site.
- `npm run test:e2e` runs the Playwright browser-flow tests.
- `npm run validate:assets` checks the vendored model and corpus assets.

Run the narrowest relevant tests first, then `npm test` and `npm run build` for application changes. Use `npm run test:e2e` when changing routes, browser storage, or visible game flows.

## Conventions

- Use strict TypeScript and existing Preact hooks; avoid adding a state library for localized state.
- Keep the UI mobile-first and preserve the existing semantic class names used by Playwright tests.
- Treat corpus IDs as stable public identifiers. Do not use array positions in share links or persistent game-instance keys.
- Handle unavailable or malformed browser data defensively so the game remains playable.
- Add or update focused tests alongside behavior changes. Keep the static corpus and vendored model out of ordinary source edits.
