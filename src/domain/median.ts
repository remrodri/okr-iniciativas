import { DomainError } from './errors';
import type { IceEvaluation, IceScores } from './types';

export function median(values: readonly number[]): number {
  if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
    throw new DomainError(
      'INVALID_LIMIT',
      'La mediana requiere una lista no vacía de números finitos.',
      'values',
    );
  }

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[middle] as number;
  }

  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export function computeMedians(
  finalistIds: readonly string[],
  evaluations: readonly IceEvaluation[],
): Readonly<Record<string, IceScores>> {
  const result: Record<string, IceScores> = {};

  for (const initiativeId of finalistIds) {
    const scores = evaluations.map((evaluation) => {
      const rating = evaluation.ratings[initiativeId];
      if (rating === undefined) {
        throw new DomainError(
          'INVALID_ICE_RATINGS',
          'Falta la evaluación de una iniciativa finalista.',
          initiativeId,
        );
      }
      return rating;
    });

    if (scores.length === 0) {
      throw new DomainError(
        'INVALID_ICE_RATINGS',
        'No hay evaluaciones para calcular las medianas.',
        initiativeId,
      );
    }

    result[initiativeId] = {
      impact: median(scores.map((score) => score.impact)),
      confidence: median(scores.map((score) => score.confidence)),
      ease: median(scores.map((score) => score.ease)),
    };
  }

  return result;
}

export function multiplicativeScore(medians: IceScores): number {
  return medians.impact * medians.confidence * medians.ease;
}
