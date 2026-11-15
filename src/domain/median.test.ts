import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import {
  computeMedians,
  median,
  multiplicativeScore,
} from './median';
import type { IceEvaluation } from './types';

function evaluation(
  participantId: string,
  ratings: Record<string, { impact: number; confidence: number; ease: number }>,
): IceEvaluation {
  return {
    id: `e-${participantId}`,
    participantId,
    ratings,
    submissionId: `sub-${participantId}`,
    submittedAt: '2026-11-14T10:00:00.000Z',
  };
}

describe('mediana', () => {
  it('calcula la mediana impar sin mutar la entrada', () => {
    const values = [9, 1, 5];
    const snapshot = [...values];

    expect(median(values)).toBe(5);
    expect(values).toEqual(snapshot);
  });

  it('promedia los dos valores centrales en una mediana par', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([10, 2, 8, 4])).toBe(6);
  });

  it('rechaza listas vacías o valores no finitos', () => {
    expect(() => median([])).toThrowError(DomainError);
    expect(() => median([1, Number.NaN])).toThrowError(DomainError);
  });
});

describe('medianas ICE', () => {
  it('calcula una mediana por criterio y por iniciativa', () => {
    const medians = computeMedians(['i1', 'i2'], [
      evaluation('p1', {
        i1: { impact: 3, confidence: 10, ease: 10 },
        i2: { impact: 1, confidence: 2, ease: 3 },
      }),
      evaluation('p2', {
        i1: { impact: 1, confidence: 10, ease: 10 },
        i2: { impact: 5, confidence: 4, ease: 2 },
      }),
    ]);

    expect(medians.i1).toEqual({ impact: 2, confidence: 10, ease: 10 });
    expect(medians.i2).toEqual({ impact: 3, confidence: 3, ease: 2.5 });
  });

  it('rechaza medianas cuando falta una evaluación de una finalista', () => {
    expect(() =>
      computeMedians(['i1'], [evaluation('p1', {})]),
    ).toThrowError(DomainError);
  });
});

describe('puntuación multiplicativa', () => {
  it('produce 300 para medianas 3, 10 y 10', () => {
    expect(
      multiplicativeScore({ impact: 3, confidence: 10, ease: 10 }),
    ).toBe(300);
  });

  it('conserva la precisión de la mediana', () => {
    expect(
      multiplicativeScore({ impact: 2.5, confidence: 10, ease: 10 }),
    ).toBe(250);
  });
});
