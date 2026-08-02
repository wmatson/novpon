export const MAX_CODE_POINTS = 250;

export function validateSentence(sentence: string): string | null {
  const clean = sentence.normalize('NFC').trim();
  if ([...clean].length > MAX_CODE_POINTS) return `Keep your sentence under ${MAX_CODE_POINTS} characters.`;
  if (!clean) return 'Enter a sentence first.';
  return null;
}
