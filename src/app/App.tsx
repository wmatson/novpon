import { useEffect, useMemo, useState } from 'preact/hooks';
import { go, routeFromHash, type Route } from './router';
import { createPuzzle } from '../puzzle/create-puzzle';
import { gradeGuess } from '../grading/grade-guess';
import { encodeCustomPuzzle, decodeSentence, decodeHint } from '../sharing/sentence-url';
import { DrandDailyEntropy } from '../daily/daily-entropy';
import { utcDate } from '../daily/utc-date';
import { selectSentence } from '../random/select-sentence';
import { browserEntropy } from '../random/browser-entropy';
import { tokenize } from '../sentence/tokenize';
import { WorkerWordEmbedder } from '../embedding/worker-client';
import { loadDraCorpus } from '../corpus/dra-corpus';
import type { GradeResult } from '../grading/types';
import type { CorpusEntry } from '../random/select-sentence';
import './styles.css';

const daily = new DrandDailyEntropy();

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

  if (!puzzle) return <main className="shell"><button className="back" onClick={() => go('/')}>← home</button><p>{message || 'Loading your sentence…'}</p></main>;
  const currentPuzzle = puzzle;
  async function submit(event: Event) {
    event.preventDefault(); if (!guess.trim() || busy) return; setBusy(true);
    try { const result = await gradeGuess(currentPuzzle, guess, embedder); setResults(previous => [...previous, result]); setMessage(result.lengthError ?? (result.won ? 'You found it.' : '')); if (!result.lengthError) setGuess(''); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Semantic grading failed. Your guess is still in the input.'); }
    finally { setBusy(false); }
  }
  async function shareRandom() {
    if (!randomId) return;
    const url = new URL(location.href); url.hash = `/random/${encodeURIComponent(randomId)}`;
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
      {result.lengthError ? <p className="error">{result.lengthError}</p> : result.feedback.map((item, wordIndex) => <span className={`token ${item.category}`} aria-label={`${item.guess}: ${item.category.replace('-', ' ')}${item.position ? `, ${item.position} position` : ''}`} key={wordIndex}><b>{item.guess}</b><small>{item.category.replace('-', ' ')}{item.position ? ` · ${item.position} position` : ''}</small></span>)}
    </div>)}</div>
    {results.at(-1)?.won ? <section className="success"><span>✦</span><h3>Sentence found</h3><p>Nice work. The target was solved exactly.</p>{source && <p className="reference">{source.book} {source.chapter}:{source.verse}</p>}<button onClick={() => go('/')}>Play another</button></section> : <><form onSubmit={submit} className="guess-form"><input value={guess} onInput={e => setGuess((e.target as HTMLInputElement).value)} placeholder="Type your guess…" autoFocus /><button disabled={busy}>Guess</button></form><p className={`guess-counter${tokenize(guess).length === puzzle.wordCount ? ' ready' : ''}`}>{tokenize(guess).length} words · target {puzzle.wordCount}</p></>}
    <p className="message" role="status" aria-live="polite">{message}</p><div className="legend"><span><i className="dot exact" />exact</span><span><i className="dot very-close" />very close</span><span><i className="dot close" />close</span><span><i className="dot far" />far</span><span><i className="dot no-match" />no match</span></div>
    <a className="github-link" href="https://github.com/wmatson/novpon" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
  </main>;
}
export default App;
