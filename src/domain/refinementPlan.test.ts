import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import { planAfterReview, validateFinalistCount } from './refinementPlan';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    if (error instanceof DomainError) {
      return error.code;
    }
    throw error;
  }
  throw new Error('Se esperaba un DomainError.');
}

describe('reglas de N', () => {
  it('acepta N entre 1 y las iniciativas disponibles', () => {
    expect(validateFinalistCount(15, 30)).toBe(15);
    expect(validateFinalistCount(30, 30)).toBe(30);
    expect(validateFinalistCount(1, 1)).toBe(1);
  });

  it('rechaza N inválido frente a las disponibles', () => {
    expect(codeOf(() => validateFinalistCount(0, 30))).toBe(
      'INVALID_FINALIST_COUNT',
    );
    expect(codeOf(() => validateFinalistCount(31, 30))).toBe(
      'INVALID_FINALIST_COUNT',
    );
    expect(codeOf(() => validateFinalistCount(1.5, 30))).toBe(
      'INVALID_FINALIST_COUNT',
    );
    expect(codeOf(() => validateFinalistCount(41, 100))).toBe(
      'INVALID_FINALIST_COUNT',
    );
  });

  it('rechaza revisiones sin iniciativas disponibles', () => {
    expect(codeOf(() => validateFinalistCount(1, 0))).toBe(
      'INVALID_INITIATIVE_COUNT',
    );
  });

  it('omite la votación cuando N iguala el total disponible', () => {
    expect(planAfterReview({ finalistCount: 10, available: 10 })).toEqual({
      action: 'SKIP_TO_ICE',
      finalistCount: 10,
    });
  });

  it('abre votación cuando N es menor que el total disponible', () => {
    expect(planAfterReview({ finalistCount: 15, available: 30 })).toEqual({
      action: 'VOTE',
      finalistCount: 15,
    });
  });
});
