export type SemanticCategory = 'exact' | 'very-close' | 'close' | 'no-match';
export type Position = 'right' | 'wrong' | null;
export interface Feedback {
  readonly guess: string;
  readonly category: SemanticCategory;
  readonly position: Position;
  readonly similarity: number;
  /** Similarity to each target word, in sentence order. Older saved guesses may omit this. */
  readonly curve?: readonly number[];
}
export interface GradeResult { readonly feedback: readonly Feedback[]; readonly won: boolean; readonly lengthError?: string; }
