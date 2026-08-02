import { useEffect, useMemo, useState } from 'preact/hooks';
import { go, routeFromHash, type Route } from './router';
import { createPuzzle } from '../puzzle/create-puzzle';
import { gradeGuess } from '../grading/grade-guess';
import { encodeSentence, decodeSentence } from '../sharing/sentence-url';
import { LocalDailyEntropy } from '../daily/daily-entropy';
import { utcDate } from '../daily/utc-date';
import { selectSentence } from '../random/select-sentence';
import { tokenize } from '../sentence/tokenize';
import corpus from '../../public/data/dra-corpus.json';
import type { GradeResult } from '../grading/types';
import type { CorpusEntry } from '../random/select-sentence';
import './styles.css';

const daily = new LocalDailyEntropy();
function App() {
  const [route, setRoute] = useState<Route>(routeFromHash());
  const [sentence, setSentence] = useState(''); const [source, setSource] = useState<CorpusEntry['source']>(); const [guess, setGuess] = useState(''); const [results, setResults] = useState<GradeResult[]>([]); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const sentenceWordCount = tokenize(sentence).length;
  const sentenceCharacterCount = [...sentence].length;
  useEffect(() => { const listener = () => { setRoute(routeFromHash()); setSentence(''); setSource(undefined); setResults([]); setGuess(''); setMessage(''); }; addEventListener('hashchange', listener); return () => removeEventListener('hashchange', listener); }, []);
  useEffect(() => { if (route.kind === 'custom') { try { setSentence(decodeSentence(route.encoded)); setSource(undefined); } catch { setMessage('That shared puzzle link is not valid.'); } } }, [route]);
  const puzzle = useMemo(() => { if (route.kind === 'home') return null; if (route.kind === 'custom') { try { return createPuzzle(decodeSentence(route.encoded)); } catch { return null; } } return sentence ? createPuzzle(sentence) : null; }, [route, sentence]);
  useEffect(() => { if ((route.kind === 'daily' || route.kind === 'random') && !sentence) void (async () => { const entropy = route.kind === 'daily' ? await daily.entropyForDate(utcDate()) : crypto.getRandomValues(new Uint8Array(32)); const selection = await selectSentence(corpus, entropy); setSentence(selection.entry.text); setSource(selection.entry.source); })(); }, [route, sentence]);
  if (route.kind === 'home') return <main className="shell home"><p className="eyebrow">SEMANTIC SENTENCE WORDLE</p><h1>Novpon<span>.</span></h1><p className="lede">Find the sentence hiding in plain sight.</p><div className="menu"><button onClick={() => go('/daily')}><strong>Daily puzzle</strong><small>A new sentence every UTC day</small></button><button onClick={() => go('/random')}><strong>Random verse</strong><small>Draw one from the Douay-Rheims</small></button><button className="outline" onClick={() => setMessage('creator')}><strong>Make a puzzle</strong><small>Turn your own sentence into a challenge</small></button></div>{message === 'creator' && <div className="creator"><label>Your sentence<textarea value={sentence} onInput={e => setSentence((e.target as HTMLTextAreaElement).value)} maxLength={250} placeholder="Write something worth guessing…" /><span className={`counter${sentenceCharacterCount === 250 ? ' at-limit' : ''}`}>{sentenceWordCount} {sentenceWordCount === 1 ? 'word' : 'words'} · {sentenceCharacterCount}/250 characters</span></label><button onClick={() => { try { go(`/p/${encodeSentence(sentence)}`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Invalid sentence.'); } }}>Create link</button></div>}<p className="hint">Semantic clues, exact words. No hints are given away.</p></main>;
  if (!puzzle) return <main className="shell"><button className="back" onClick={() => go('/')}>← home</button><p>{message || 'Loading your sentence…'}</p></main>;
  const currentPuzzle = puzzle;
  async function submit(event: Event) { event.preventDefault(); if (!guess.trim() || busy) return; setBusy(true); const result = await gradeGuess(currentPuzzle, guess); setResults(previous => [...previous, result]); setMessage(result.lengthError ?? (result.won ? 'You found it.' : '')); if (!result.lengthError) setGuess(''); setBusy(false); }
  return <main className="shell game"><button className="back" onClick={() => go('/')}>← home</button><div className="game-header"><p className="eyebrow">{route.kind === 'daily' ? `DAILY · ${utcDate()}` : route.kind === 'random' ? 'RANDOM VERSE' : 'CUSTOM PUZZLE'}</p><h2>Guess the sentence</h2><p>Use exactly <b>{puzzle.wordCount}</b> words. Meaning earns closeness; exact words win.</p></div><div className="guess-list">{results.map((result, index) => <div className="attempt" key={index}>{result.lengthError ? <p className="error">{result.lengthError}</p> : result.feedback.map((item, wordIndex) => <span className={`token ${item.category}`} key={wordIndex}><b>{item.guess}</b><small>{item.category.replace('-', ' ')}{item.position ? ` · ${item.position} position` : ''}</small></span>)}</div>)}</div>{results.at(-1)?.won ? <section className="success"><span>✦</span><h3>Sentence found</h3><p>Nice work. The target was solved exactly.</p>{source && <p className="reference">{source.book} {source.chapter}:{source.verse}</p>}<button onClick={() => go('/')}>Play another</button></section> : <><form onSubmit={submit} className="guess-form"><input value={guess} onInput={e => setGuess((e.target as HTMLInputElement).value)} placeholder="Type your guess…" autoFocus /><button disabled={busy}>Guess</button></form><p className={`guess-counter${tokenize(guess).length === puzzle.wordCount ? ' ready' : ''}`}>{tokenize(guess).length}/{puzzle.wordCount} words</p></>}<p className="message">{message}</p><div className="legend"><span><i className="dot exact" />exact</span><span><i className="dot very-close" />very close</span><span><i className="dot close" />close</span><span><i className="dot far" />far</span><span><i className="dot no-match" />no match</span></div></main>;
}
export default App;
