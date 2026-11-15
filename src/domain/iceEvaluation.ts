import { DomainError } from './errors';
import { LIMITS } from './limits';
import type { IceEvaluation, IceScores } from './types';

export interface CreateIceEvaluationInput {
  readonly id: string;
  readonly participantId: string;
  readonly finalistIds: readonly string[];
  readonly ratings: Readonly<Record<string, IceScores>>;
  readonly submissionId: string;
  readonly now: string;
}

function assertScore(value: number, field: string): number {
  if (
    !Number.isInteger(value) ||
    value < LIMITS.iceScoreMin ||
    value > LIMITS.iceScoreMax
  ) {
    throw new DomainError(
      'INVALID_ICE_SCORE',
      `Cada calificación debe ser un entero entre ${LIMITS.iceScoreMin} y ${LIMITS.iceScoreMax}.`,
      field,
    );
  }
  return value;
}

export function assertIceScores(scores: IceScores, field: string): IceScores {
  return {
    impact: assertScore(scores.impact, `${field}.impact`),
    confidence: assertScore(scores.confidence, `${field}.confidence`),
    ease: assertScore(scores.ease, `${field}.ease`),
  };
}

export function createIceEvaluation(
  input: CreateIceEvaluationInput,
): IceEvaluation {
  const expected = new Set(input.finalistIds);
  const received = Object.keys(input.ratings);

  if (
    expected.size === 0 ||
    received.length !== expected.size ||
    received.some((id) => !expected.has(id))
  ) {
    throw new DomainError(
      'INVALID_ICE_RATINGS',
      'Debes evaluar todas las iniciativas finalistas en los tres criterios.',
      'ratings',
    );
  }

  if (input.submissionId.trim().length === 0) {
    throw new DomainError(
      'CONFLICTING_SUBMISSION',
      'La evaluación requiere un identificador estable.',
      'submissionId',
    );
  }

  const ratings: Record<string, IceScores> = {};
  for (const id of input.finalistIds) {
    const scores = input.ratings[id];
    if (scores === undefined) {
      throw new DomainError(
        'INVALID_ICE_RATINGS',
        'Debes evaluar todas las iniciativas finalistas en los tres criterios.',
        'ratings',
      );
    }
    ratings[id] = assertIceScores(scores, id);
  }

  return {
    id: input.id,
    participantId: input.participantId,
    ratings,
    submissionId: input.submissionId,
    submittedAt: input.now,
  };
}

function sameRatings(
  left: Readonly<Record<string, IceScores>>,
  right: Readonly<Record<string, IceScores>>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return leftKeys.every((key) => {
    const a = left[key];
    const b = right[key];
    return (
      a !== undefined &&
      b !== undefined &&
      a.impact === b.impact &&
      a.confidence === b.confidence &&
      a.ease === b.ease
    );
  });
}

export interface SubmitIceEvaluationResult {
  readonly evaluations: readonly IceEvaluation[];
  readonly status: 'CREATED' | 'DUPLICATE';
}

export function submitIceEvaluation(
  existing: readonly IceEvaluation[],
  evaluation: IceEvaluation,
): SubmitIceEvaluationResult {
  const sameParticipant = existing.filter(
    (item) => item.participantId === evaluation.participantId,
  );

  if (sameParticipant.length === 0) {
    return { evaluations: [...existing, evaluation], status: 'CREATED' };
  }

  const isExactReplay = sameParticipant.some(
    (item) =>
      item.submissionId === evaluation.submissionId &&
      sameRatings(item.ratings, evaluation.ratings),
  );

  if (isExactReplay) {
    return { evaluations: existing, status: 'DUPLICATE' };
  }

  throw new DomainError(
    'CONFLICTING_SUBMISSION',
    'Ya existe una evaluación ICE para este participante.',
    'submissionId',
  );
}
