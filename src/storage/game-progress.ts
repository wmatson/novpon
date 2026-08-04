import type { Feedback, GradeResult, Position, SemanticCategory } from '../grading/types';

export interface GameInstance {
  readonly kind: 'daily' | 'random' | 'custom';
  readonly id: string;
}

const STORAGE_PREFIX = 'novpon:game-progress:v1:';
const CATEGORIES: readonly SemanticCategory[] = ['exact', 'very-close', 'close', 'no-match'];
const POSITIONS: readonly Position[] = ['right', 'wrong', null];

export function progressKeyForInstance(instance: GameInstance): string {
  return `${STORAGE_PREFIX}${instance.kind}:${encodeURIComponent(instance.id)}`;
}

export function loadGameProgress(key: string): GradeResult[] {
  try {
    const stored = globalThis.localStorage?.getItem(key);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isGradeResult) : [];
  } catch {
    return [];
  }
}

export function saveGameProgress(key: string, results: readonly GradeResult[]): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(results));
  } catch {
    // Storage can be unavailable or full; the in-memory game remains playable.
  }
}

function isGradeResult(value: unknown): value is GradeResult {
  if (!isRecord(value) || typeof value.won !== 'boolean' || !Array.isArray(value.feedback)) return false;
  if ('lengthError' in value && value.lengthError !== undefined && typeof value.lengthError !== 'string') return false;
  return value.feedback.every(isFeedback);
}

function isFeedback(value: unknown): value is Feedback {
  return isRecord(value)
    && typeof value.guess === 'string'
    && typeof value.category === 'string'
    && CATEGORIES.includes(value.category as SemanticCategory)
    && (value.position === null || typeof value.position === 'string')
    && POSITIONS.includes(value.position as Position)
    && typeof value.similarity === 'number'
    && Number.isFinite(value.similarity)
    && (!('curve' in value) || (Array.isArray(value.curve) && value.curve.every(item => typeof item === 'number' && Number.isFinite(item))));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
