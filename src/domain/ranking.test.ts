import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import { buildRanking, weightedScore } from './ranking';
import type { IceConfig, IceEvaluation, IceScores } from './types';

const now = '2026-11-14T10:00:00.000Z';
const multiplicative: IceConfig = { method: 'MULTIPLICATIVE', weights: null };

function evaluation(
  ratings: Record<string, IceScores>,
  participantId = 'p1',
): IceEvaluation {
  return {
    id: `e-${participantId}`,
    participantId,
    ratings,
    submissionId: `sub-${participantId}`,
    submittedAt: now,
  };
}

function scores(impact: number, confidence: number, ease: number): IceScores {
  return { impact, confidence, ease };
}

describe('puntuación ponderada', () => {
  it('produce 6,5 para medianas 3, 10 y 10 con pesos 50/25/25', () => {
    expect(
      weightedScore(scores(3, 10, 10), {
        impact: 0.5,
        confidence: 0.25,
        ease: 0.25,
      }),
    ).toBe(6.5);
  });

  it('conserva la precisión completa', () => {
    expect(
      weightedScore(scores(2.5, 10, 10), {
        impact: 0.5,
        confidence: 0.25,
        ease: 0.25,
      }),
    ).toBe(1.25 + 2.5 + 2.5);
  });
});

describe('ranking', () => {
  it('ordena por puntuación descendente y asigna posiciones 1,2,2,4', () => {
    const ranking = buildRanking(
      ['a', 'b', 'c', 'd'],
      [
        evaluation({
          a: scores(4, 10, 10),
          b: scores(3, 10, 10),
          c: scores(3, 10, 10),
          d: scores(2, 10, 10),
        }),
      ],
      multiplicative,
    );

    expect(ranking.map((entry) => entry.initiativeId)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ]);
    expect(ranking.map((entry) => entry.score)).toEqual([400, 300, 300, 200]);
    expect(ranking.map((entry) => entry.position)).toEqual([1, 2, 2, 4]);
  });

  it('desempata por Impacto y luego Confianza', () => {
    const ranking = buildRanking(
      ['a', 'b'],
      [
        evaluation({
          a: scores(2, 3, 5),
          b: scores(3, 2, 5),
        }),
      ],
      multiplicative,
    );

    expect(ranking.map((entry) => entry.initiativeId)).toEqual(['b', 'a']);
    expect(ranking.map((entry) => entry.position)).toEqual([1, 2]);
  });

  it('usa Facilidad como último desempate', () => {
    const ranking = buildRanking(
      ['a', 'b'],
      [
        evaluation({
          a: scores(2, 4, 1),
          b: scores(2, 4, 10),
        }),
      ],
      { method: 'WEIGHTED', weights: { impact: 0.5, confidence: 0.5, ease: 0 } },
    );

    expect(ranking.map((entry) => entry.initiativeId)).toEqual(['b', 'a']);
    expect(ranking.map((entry) => entry.position)).toEqual([1, 2]);
  });

  it('promedia medianas pares y conserva el orden sin redondear', () => {
    const ranking = buildRanking(
      ['a'],
      [
        evaluation({ a: scores(2, 10, 10) }, 'p1'),
        evaluation({ a: scores(3, 10, 10) }, 'p2'),
      ],
      multiplicative,
    );

    expect(ranking[0]?.impactMedian).toBe(2.5);
    expect(ranking[0]?.score).toBe(250);
  });

  it('rechaza configuraciones incompletas y ausencia de evaluaciones', () => {
    expect(() =>
      buildRanking(['a'], [], multiplicative),
    ).toThrowError(DomainError);
    expect(() =>
      buildRanking(['a'], [evaluation({ a: scores(1, 1, 1) })], {
        method: 'WEIGHTED',
        weights: null,
      }),
    ).toThrowError(DomainError);
  });
});
