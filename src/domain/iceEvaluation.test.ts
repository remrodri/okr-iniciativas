import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import {
  createIceEvaluation,
  submitIceEvaluation,
  type CreateIceEvaluationInput,
} from './iceEvaluation';

const now = '2026-11-14T10:00:00.000Z';

const baseInput: CreateIceEvaluationInput = {
  id: 'e1',
  participantId: 'p1',
  finalistIds: ['i1', 'i2'],
  ratings: {
    i1: { impact: 3, confidence: 10, ease: 10 },
    i2: { impact: 5, confidence: 4, ease: 2 },
  },
  submissionId: 'sub-1',
  now,
};

describe('evaluaciones ICE', () => {
  it('acepta una matriz completa con enteros de 1 a 10', () => {
    const evaluation = createIceEvaluation(baseInput);

    expect(evaluation.participantId).toBe('p1');
    expect(evaluation.ratings.i1).toEqual({
      impact: 3,
      confidence: 10,
      ease: 10,
    });
  });

  it('rechaza iniciativas faltantes o ajenas', () => {
    expect(() =>
      createIceEvaluation({
        ...baseInput,
        ratings: { i1: baseInput.ratings.i1! },
      }),
    ).toThrowError(DomainError);

    expect(() =>
      createIceEvaluation({
        ...baseInput,
        ratings: {
          ...baseInput.ratings,
          i9: { impact: 1, confidence: 1, ease: 1 },
        },
      }),
    ).toThrowError(DomainError);
  });

  it('rechaza calificaciones fuera de rango o no enteras', () => {
    for (const impact of [0, 11, 5.5, Number.NaN]) {
      expect(() =>
        createIceEvaluation({
          ...baseInput,
          ratings: {
            ...baseInput.ratings,
            i1: { impact, confidence: 5, ease: 5 },
          },
        }),
      ).toThrowError(DomainError);
    }
  });

  it('reenviar el mismo submissionId es idempotente', () => {
    const first = submitIceEvaluation([], createIceEvaluation(baseInput));
    const duplicate = submitIceEvaluation(
      first.evaluations,
      createIceEvaluation(baseInput),
    );

    expect(first.status).toBe('CREATED');
    expect(duplicate.status).toBe('DUPLICATE');
    expect(duplicate.evaluations).toHaveLength(1);
  });

  it('rechaza un segundo envío distinto del mismo participante', () => {
    const existing = submitIceEvaluation(
      [],
      createIceEvaluation(baseInput),
    ).evaluations;

    expect(() =>
      submitIceEvaluation(
        existing,
        createIceEvaluation({ ...baseInput, id: 'e2', submissionId: 'sub-2' }),
      ),
    ).toThrowError(DomainError);

    expect(() =>
      submitIceEvaluation(
        existing,
        createIceEvaluation({
          ...baseInput,
          ratings: {
            i1: { impact: 1, confidence: 1, ease: 1 },
            i2: { impact: 2, confidence: 2, ease: 2 },
          },
        }),
      ),
    ).toThrowError(DomainError);
  });
});
