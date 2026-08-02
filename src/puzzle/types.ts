import type { WordToken } from '../sentence/types';
export interface Puzzle { readonly targetText: string; readonly targetTokens: readonly WordToken[]; readonly wordCount: number; }
