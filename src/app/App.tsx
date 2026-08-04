import { useEffect, useMemo, useState } from 'preact/hooks';
import { go, routeFromHash, type Route } from './router';
import { createPuzzle } from '../puzzle/create-puzzle';
import { gradeGuess } from '../grading/grade-guess';
import { encodeCustomPuzzle, encodeCorpusId, decodeSentence, decodeHint } from '../sharing/sentence-url';
import { DrandDailyEntropy } from '../daily/daily-entropy';
import { utcDate } from '../daily/utc-date';
import { selectSentence } from '../random/select-sentence';
import { browserEntropy } from '../random/browser-entropy';
import { tokenize } from '../sentence/tokenize';
import { WorkerWordEmbedder } from '../embedding/worker-client';
import { loadDraCorpus } from '../corpus/dra-corpus';
import { loadGameProgress, progressKeyForInstance, saveGameProgress } from '../storage/game-progress';
import type { GradeResult } from '../grading/types';
import type { WordEmbedder } from '../embedding/word-embedder';
import type { Puzzle } from '../puzzle/types';
import type { CorpusEntry } from '../random/select-sentence';
import './styles.css';

const daily = new DrandDailyEntropy();
const DEMO_TARGET = 'The quick brown fox jumped over the lazy dog by the river';
const DEMO_WORDS = ['greatest', 'silent', 'animal', 'colorful', 'speed', 'royal', 'winter', 'garden'];
const DEMO_PUZZLE = createPuzzle(DEMO_TARGET);

function curveGeometry(rawCurve: readonly number[], wordIndex: number, previewWordIndex?: number) {
  const curve = rawCurve.length ? rawCurve : [0];
  const width = 240;
  const height = 62;
  const horizontalPadding = 5;
  const verticalPadding = 7;
  const plotWidth = width - horizontalPadding * 2;
  const plotHeight = height - verticalPadding * 2;
  const xFor = (index: number) => horizontalPadding + (curve.length === 1 ? plotWidth / 2 : index / (curve.length - 1) * plotWidth);
  const yFor = (similarity: number) => verticalPadding + (1 - Math.max(0, Math.min(1, similarity))) * plotHeight;
  const points = curve.map((similarity, index) => `${xFor(index)},${yFor(similarity)}`);
  const area = `M ${horizontalPadding},${height - verticalPadding} L ${points.join(' L ')} L ${width - horizontalPadding},${height - verticalPadding} Z`;
  const tickX = xFor(Math.min(wordIndex, curve.length - 1));
  const previewTickX = previewWordIndex !== undefined && previewWordIndex < curve.length ? xFor(previewWordIndex) : undefined;
  return { area, points: points.join(' '), tickX, previewTickX, width, height };
}

function maxClosenessFor(item: GradeResult['feedback'][number]): number {
  return item.curve?.length ? Math.max(...item.curve) : item.similarity;
}

function CurveList({ result, wordCount, showValues = false, previewWordIndex }: { result: GradeResult; wordCount: number; showValues?: boolean; previewWordIndex?: number }) {
  if (result.lengthError) return <p className="error">{result.lengthError}</p>;
  return <div className="curve-list">{result.feedback.map((item, wordIndex) => {
    const curve = item.curve?.length ? item.curve : Array.from({ length: Math.max(1, wordCount) }, () => item.similarity);
    const chart = curveGeometry(curve, wordIndex, previewWordIndex);
    const maxCloseness = maxClosenessFor(item);
    return <div className={`curve-row${showValues ? ' demo-curve-row' : ''}`} key={wordIndex}>
      <span className={`curve-word ${item.category}${item.position === 'wrong' ? ' wrong-position' : ''}`} title={`${item.category.replace('-', ' ')} · max closeness ${maxCloseness.toFixed(2)}${item.position ? ` · ${item.position} position` : ''}`}><b>{item.guess}</b><small>{maxCloseness.toFixed(2)}</small></span>
      <svg className="closeness-curve" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-label={`${item.guess}: max closeness ${maxCloseness.toFixed(2)}; closeness across ${wordCount} target positions; current position ${wordIndex + 1}`}>
        <path className="curve-area" d={chart.area} />
        <polyline className="curve-line" points={chart.points} />
        <line className="curve-tick" x1={chart.tickX} y1="3" x2={chart.tickX} y2={chart.height - 3} />
        {chart.previewTickX !== undefined && <line className="curve-preview-tick" data-word-index={previewWordIndex} x1={chart.previewTickX} y1="3" x2={chart.previewTickX} y2={chart.height - 3} aria-hidden="true" />}
      </svg>
      {showValues && <details className="curve-values"><summary>raw values</summary><code>{(item.curve ?? [item.similarity]).map(value => value.toFixed(3)).join(' · ')}</code></details>}
    </div>;
  })}</div>;
}

function activeWordIndexForGuess(guess: string, wordCount: number): number | undefined {
  const tokens = tokenize(guess);
  if (!tokens.length) return undefined;
  const index = tokens.length - 1 + (/\s$/u.test(guess) ? 1 : 0);
  return index < wordCount ? index : undefined;
}

function DemoPage({ puzzle, embedder }: { puzzle: Puzzle; embedder: WordEmbedder }) {
  const [results, setResults] = useState<GradeResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function gradeDemo() {
    if (busy) return;
    setBusy(true); setMessage('Grading fresh words…'); setResults([]);
    try {
      await embedder.embedWords(['the']);
      const nextResults: GradeResult[] = [];
      for (const word of DEMO_WORDS) nextResults.push(await gradeGuess(puzzle, word, embedder));
      setResults(nextResults); setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Semantic grading failed.');
    } finally { setBusy(false); }
  }

  useEffect(() => { void gradeDemo(); }, [puzzle, embedder]);

  return <main className="shell game demo-page">
    <button className="back" onClick={() => go('/')}>← home</button>
    <div className="game-header"><p className="eyebrow">EMBEDDING DEMO</p><h2>Fresh semantic curves</h2>
      <p>Target sentence</p><p className="demo-target">{DEMO_TARGET}</p>
      <p>Every word below is graded independently against every target position. Nothing is saved.</p>
      <button className="share-button" onClick={gradeDemo} disabled={busy}>{busy ? 'Grading…' : 'Grade afresh ↻'}</button>
    </div>
    <div className="demo-results">{results.map((result, index) => <div className="attempt" key={index}><span className="attempt-number">Word {index + 1} · {DEMO_WORDS[index]}</span><CurveList result={result} wordCount={puzzle.wordCount} showValues /></div>)}</div>
    <p className="message" role="status" aria-live="polite">{message}</p>
    <a className="github-link" href="https://github.com/wmatson/novpon" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
  </main>;
}

function App() {
  const [route, setRoute] = useState<Route>(routeFromHash());
  const [sentence, setSentence] = useState('');
  const [hint, setHint] = useState('');
  const [source, setSource] = useState<CorpusEntry['source']>();
  const [selectedRandomId, setSelectedRandomId] = useState<string>();
  const [corpus, setCorpus] = useState<CorpusEntry[] | null>(null);
  const [guess, setGuess] = useState('');
  const [results, setResults] = useState<GradeResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const embedder = useMemo(() => new WorkerWordEmbedder(), []);
  const sentenceWordCount = tokenize(sentence).length;
  const sentenceCharacterCount = [...sentence].length;
  const randomId = route.kind === 'random' ? route.id ?? selectedRandomId : undefined;
  const progressKey = useMemo(() => {
    if (route.kind === 'daily') return progressKeyForInstance({ kind: 'daily', id: utcDate() });
    if (route.kind === 'random' && randomId) return progressKeyForInstance({ kind: 'random', id: randomId });
    if (route.kind === 'custom') {
      const hint = route.hintEncoded ? `?h=${route.hintEncoded}` : '';
      return progressKeyForInstance({ kind: 'custom', id: `${route.encoded}${hint}` });
    }
    return undefined;
  }, [route, randomId]);

  useEffect(() => {
    const listener = () => {
      setRoute(routeFromHash()); setSentence(''); setHint(''); setSource(undefined);
      setSelectedRandomId(undefined); setResults([]); setGuess(''); setMessage('');
    };
    addEventListener('hashchange', listener);
    return () => removeEventListener('hashchange', listener);
  }, []);

  useEffect(() => {
    if (route.kind !== 'custom') return;
    try { setSentence(decodeSentence(route.encoded)); setHint(route.hintEncoded ? decodeHint(route.hintEncoded) : ''); setSource(undefined); }
    catch { setMessage('That shared puzzle link is not valid.'); }
  }, [route]);

  const puzzle = useMemo(() => {
    if (route.kind === 'home') return null;
    try { return createPuzzle(route.kind === 'custom' ? decodeSentence(route.encoded) : sentence); }
    catch { return null; }
  }, [route, sentence]);

  useEffect(() => {
    const saved = progressKey ? loadGameProgress(progressKey) : [];
    setResults(saved);
    if (!progressKey || !puzzle || !saved.some(result => result.feedback.some(item => !item.curve?.length))) return;
    let cancelled = false;
    void (async () => {
      try {
        await embedder.load();
        const upgraded = await Promise.all(saved.map(async result => {
          if (result.lengthError || result.feedback.every(item => item.curve?.length)) return result;
          const regraded = await gradeGuess(puzzle, result.feedback.map(item => item.guess).join(' '), embedder);
          return regraded.lengthError ? result : regraded;
        }));
        if (cancelled) return;
        setResults(upgraded);
        saveGameProgress(progressKey, upgraded);
      } catch {
        // Keep the saved result if an old attempt cannot be upgraded.
      }
    })();
    return () => { cancelled = true; };
  }, [progressKey, puzzle, embedder]);

  useEffect(() => {
    if (!puzzle) return;
    setMessage('Loading semantic model…');
    void embedder.load().then(() => setMessage('')).catch(error => setMessage(error instanceof Error ? error.message : 'Semantic model failed to load.'));
  }, [puzzle, embedder]);

  useEffect(() => {
    if (!['daily', 'random'].includes(route.kind) || sentence) return;
    void (async () => {
      setMessage(route.kind === 'daily' ? "Generating today's puzzle…" : 'Loading verse corpus…');
      const loadedCorpus = corpus ?? await loadDraCorpus(import.meta.env.BASE_URL);
      if (!corpus) setCorpus([...loadedCorpus]);
      const entropy = route.kind === 'daily' ? await daily.entropyForDate(utcDate()) : browserEntropy();
      const selection = route.kind === 'random' && route.id
        ? { entry: loadedCorpus.find(entry => entry.id === route.id), corpusIndex: -1 }
        : await selectSentence(loadedCorpus, entropy);
      if (!selection.entry) throw new Error('That shared random verse is not in this corpus.');
      if (route.kind === 'random' && !route.id) {
        setSelectedRandomId(selection.entry.id);
      }
      if (route.kind === 'random' && route.id) setSelectedRandomId(route.id);
      setSentence(selection.entry.text); setSource(selection.entry.source); setMessage('');
    })().catch(error => setMessage(error instanceof Error ? error.message : 'Could not load the verse corpus.'));
  }, [route, sentence, corpus]);

  if (route.kind === 'home') return <main className="shell home">
    <p className="eyebrow">SEMANTIC SENTENCE WORDLE</p><h1>Novpon<span>.</span></h1>
    <p className="lede">Find the sentence hiding in plain sight.</p>
    <div className="menu">
      <button onClick={() => go('/daily')}><strong>Daily puzzle</strong><small>A new sentence every UTC day</small></button>
      <button onClick={() => go('/random')}><strong>Random verse</strong><small>Draw one from the curated collection</small></button>
      <button className="outline" onClick={() => setMessage('creator')}><strong>Make a puzzle</strong><small>Turn your own sentence into a challenge</small></button>
    </div>
    {message === 'creator' && <div className="creator">
      <label>Your sentence<textarea value={sentence} onInput={e => setSentence((e.target as HTMLTextAreaElement).value)} maxLength={250} placeholder="Write something worth guessing…" />
        <span className={`counter${sentenceCharacterCount === 250 ? ' at-limit' : ''}`}>{sentenceWordCount} {sentenceWordCount === 1 ? 'word' : 'words'} · {sentenceCharacterCount}/250 characters</span>
      </label>
      <label>Hint <span className="optional">(optional)</span><textarea className="hint-input" value={hint} onInput={e => setHint((e.target as HTMLTextAreaElement).value)} maxLength={160} placeholder="A clue for your solver…" /></label>
      <button onClick={() => { try { go(encodeCustomPuzzle(sentence, hint)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid sentence.'); } }}>Create link</button>
    </div>}
    <p className="hint">Semantic clues, exact words. No hints are given away.</p>
    <a className="notes-link" href="#/notes">Notes on the corpus →</a>
    <a className="demo-link" href="#/demo">Embedding demo →</a>
    <a className="github-link" href="https://github.com/wmatson/novpon" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
  </main>;

  if (route.kind === 'notes') return <main className="shell notes-page">
    <button className="back" onClick={() => go('/')}>← home</button>
    <p className="eyebrow">ABOUT THE CORPUS</p>
    <h2>Why these verses?</h2>
    <p>Novpon uses a curated subset of the Douay-Rheims Bible so the daily and random games stay approachable. The full Bible makes the search space too broad for a short semantic guessing game.</p>
    <p>The playable collection includes <b>Psalms, Proverbs, Sirach, Wisdom,</b> and <b>Ecclesiastes</b>, plus a small set of widely recognized verses from other books, including Genesis 1:1, John 3:16, Romans 8:28, Philippians 4:13, and Revelation 21:4.</p>
    <p>Each corpus entry keeps a stable compound identifier in the form <code>book-slug:chapter:verse</code>. That identifier powers share links, so a shared random verse can be reopened without depending on its ordinal position in the corpus.</p>
    <p>Manual puzzles are separate: you can still create a link for any sentence up to the normal length limit.</p>
    <a className="notes-link" href="#/random">Play a random verse →</a>
  </main>;

  if (route.kind === 'demo') return <DemoPage puzzle={DEMO_PUZZLE} embedder={embedder} />;

  if (!puzzle) return <main className="shell"><button className="back" onClick={() => go('/')}>← home</button><p>{message || 'Loading your sentence…'}</p></main>;
  const currentPuzzle = puzzle;
  const guessWordCount = tokenize(guess).length;
  const previewWordIndex = activeWordIndexForGuess(guess, currentPuzzle.wordCount);
  async function submit(event: Event) {
    event.preventDefault(); if (!guess.trim() || busy) return; setBusy(true);
    try {
      const result = await gradeGuess(currentPuzzle, guess, embedder);
      const nextResults = [...results, result];
      setResults(nextResults);
      if (progressKey) saveGameProgress(progressKey, nextResults);
      setMessage(result.lengthError ?? (result.won ? 'You found it.' : ''));
      if (!result.lengthError) setGuess('');
    }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Semantic grading failed. Your guess is still in the input.'); }
    finally { setBusy(false); }
  }
  async function shareRandom() {
    if (!randomId) return;
    const url = new URL(location.href); url.hash = `/random/${encodeCorpusId(randomId)}`;
    try {
      const sharingNavigator = navigator as Navigator & { share?: (data: { title: string; url: string }) => Promise<void> };
      if (sharingNavigator.share) await sharingNavigator.share({ title: 'Novpon random verse', url: url.toString() });
      else { await navigator.clipboard.writeText(url.toString()); setMessage('Share link copied.'); }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('Could not share this verse.');
    }
  }

  return <main className="shell game">
    <button className="back" onClick={() => go('/')}>← home</button>
    <div className="game-header"><p className="eyebrow">{route.kind === 'daily' ? `DAILY · ${utcDate()}` : route.kind === 'random' ? 'RANDOM VERSE' : 'CUSTOM PUZZLE'}</p><h2>Guess the sentence</h2>
      {source && <p className="source-hint">Bible book: <b>{source.book}</b></p>}{hint && <p className="source-hint">Hint: <b>{hint}</b></p>}
      <p>The target has <b>{puzzle.wordCount}</b> words. Guess any number; exact words in order solve it.</p>
      {route.kind === 'random' && randomId && <button className="share-button" onClick={shareRandom}>Share this verse ↗</button>}
    </div>
    <div className="guess-list">{results.map((result, index) => <div className="attempt" key={index}><span className="attempt-number">Guess {index + 1}</span>
      <CurveList result={result} wordCount={currentPuzzle.wordCount} previewWordIndex={previewWordIndex} />
    </div>)}</div>
    {results.at(-1)?.won ? <section className="success"><span>✦</span><h3>Sentence found</h3><p>Nice work. The target was solved exactly.</p>{source && <p className="reference">{source.book} {source.chapter}:{source.verse}</p>}<button onClick={() => go('/')}>Play another</button></section> : <div className="guess-composer"><form onSubmit={submit} className="guess-form"><input value={guess} onInput={e => setGuess((e.target as HTMLInputElement).value)} placeholder="Type your guess…" autoFocus /><button disabled={busy}>Guess</button></form><p className={`guess-counter${guessWordCount === puzzle.wordCount ? ' ready' : ''}`}>{guessWordCount} words · target {puzzle.wordCount}</p></div>}
    <p className="message" role="status" aria-live="polite">{message}</p><p className="curve-help">Each curve shows closeness across the target sentence. Solid ticks mark submitted words; the dashed tick follows the word you’re typing.</p>
    <a className="github-link" href="https://github.com/wmatson/novpon" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
  </main>;
}
export default App;
