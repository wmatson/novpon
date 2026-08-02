import { MAX_CODE_POINTS, validateSentence } from '../sentence/length';
import { tokenize } from '../sentence/tokenize';
function base64url(bytes: Uint8Array): string { let binary = ''; bytes.forEach(byte => binary += String.fromCharCode(byte)); return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, ''); }
export function encodeSentence(sentence: string): string { const error = validateSentence(sentence); if (error || !tokenize(sentence).length) throw new Error(error ?? 'Sentence must contain a word.'); return base64url(new TextEncoder().encode(sentence)); }
export function decodeSentence(encoded: string): string {
  if (!encoded || !/^[A-Za-z0-9_-]+$/.test(encoded)) throw new Error('Invalid shared puzzle.');
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4); let binary: string;
  try { binary = atob(padded); } catch { throw new Error('Invalid shared puzzle.'); }
  try { const text = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, char => char.charCodeAt(0))); if ([...text].length > MAX_CODE_POINTS || !tokenize(text).length) throw new Error(); return text; } catch { throw new Error('Invalid shared puzzle.'); }
}
