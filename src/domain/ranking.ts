import { DomainError } from './errors';
import { computeMedians, multiplicativeScore } from './median';
import type {
  IceConfig,
  IceEvaluation,
  IceScores,
  IceWeights,
  RankingEntry,
} from './types';

export function weightedScore(medians: IceScores, weights: IceWeights): number {
  return (
    medians.impact * weights.impact +
    medians.confidence * weights.confidence +
    medians.ease * weights.ease
  );
}

function scoreFor(medians: IceScores, config: IceConfig): number {
  if (config.method === 'MULTIPLICATIVE') {
    return multiplicativeScore(medians);
  }

  if (config.weights === null) {
    throw new DomainError(
      'INVALID_ICE_WEIGHTS',
      'El método ponderado requiere pesos para calcular el ranking.',
      'weights',
    );
  }

  return weightedScore(medians, config.weights);
}

function compareEntries(left: RankingEntry, right: RankingEntry): number {
  return (
    right.score - left.score ||
    right.impactMedian - left.impactMedian ||
    right.confidenceMedian - left.confidenceMedian ||
    right.easeMedian - left.easeMedian
  );
}

function isFullTie(left: RankingEntry, right: RankingEntry): boolean {
  return (
    left.score === right.score &&
    left.impactMedian === right.impactMedian &&
    left.confidenceMedian === right.confidenceMedian &&
    left.easeMedian === right.easeMedian
  );
}

export function buildRanking(
  finalistIds: readonly string[],
  evaluations: readonly IceEvaluation[],
  config: IceConfig,
): readonly RankingEntry[] {
  if (finalistIds.length === 0) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      'El ranking requiere al menos una iniciativa finalista.',
      'finalistIds',
    );
  }

  const medians = computeMedians(finalistIds, evaluations);
  const unsorted: RankingEntry[] = finalistIds.map((initiativeId) => {
    const score = medians[initiativeId];
    if (score === undefined) {
      throw new DomainError(
        'INVALID_ICE_RATINGS',
        'Falta la mediana de una iniciativa finalista.',
        initiativeId,
      );
    }

    return {
      initiativeId,
      impactMedian: score.impact,
      confidenceMedian: score.confidence,
      easeMedian: score.ease,
      score: scoreFor(score, config),
      position: 0,
    };
  });

  const sorted = [...unsorted].sort(compareEntries);
  const ranked: RankingEntry[] = [];

  for (const [index, entry] of sorted.entries()) {
    const previous = ranked[index - 1];
    const position =
      previous !== undefined && isFullTie(entry, previous)
        ? previous.position
        : index + 1;
    ranked.push({ ...entry, position });
  }

  return ranked;
}
