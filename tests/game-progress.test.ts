import { beforeEach, describe, expect, it } from 'vitest';
import { loadGameProgress, progressKeyForInstance, saveGameProgress } from '../src/storage/game-progress';
import type { GradeResult } from '../src/grading/types';

const result: GradeResult = {
  feedback: [{ guess: 'bright', category: 'exact', position: 'right', similarity: 1, curve: [1] }],
  won: false,
};

describe('game progress storage', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
  });

  it('creates distinct stable keys for each game instance', () => {
    expect(progressKeyForInstance({ kind: 'daily', id: '2026-08-03' })).toBe('novpon:game-progress:v1:daily:2026-08-03');
    expect(progressKeyForInstance({ kind: 'random', id: 'genesis:1:1' })).not.toBe(progressKeyForInstance({ kind: 'random', id: 'genesis:1:2' }));
    expect(progressKeyForInstance({ kind: 'custom', id: 'sentence?hint=clue' })).toContain('sentence%3Fhint%3Dclue');
  });

  it('round trips saved results', () => {
    const key = progressKeyForInstance({ kind: 'daily', id: '2026-08-03' });
    saveGameProgress(key, [result]);
    expect(loadGameProgress(key)).toEqual([result]);
  });

  it('ignores malformed saved data', () => {
    const key = progressKeyForInstance({ kind: 'daily', id: '2026-08-03' });
    globalThis.localStorage.setItem(key, JSON.stringify([{ won: true, feedback: [{ guess: 'oops' }] }]));
    expect(loadGameProgress(key)).toEqual([]);
  });
});
