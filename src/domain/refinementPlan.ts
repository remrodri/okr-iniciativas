import { DomainError } from './errors';
import { LIMITS } from './limits';

export function validateFinalistCount(
  finalistCount: number,
  availableInitiatives: number,
): number {
  if (!Number.isInteger(availableInitiatives) || availableInitiatives < 1) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      'No hay iniciativas disponibles para la depuración.',
      'availableInitiatives',
    );
  }

  if (
    !Number.isInteger(finalistCount) ||
    finalistCount < 1 ||
    finalistCount > availableInitiatives ||
    finalistCount > LIMITS.finalistsMax
  ) {
    throw new DomainError(
      'INVALID_FINALIST_COUNT',
      `N debe ser un entero entre 1 y ${Math.min(availableInitiatives, LIMITS.finalistsMax)}.`,
      'finalistCount',
    );
  }

  return finalistCount;
}

export interface RefinementPlanInput {
  readonly finalistCount: number;
  readonly available: number;
}

export interface RefinementPlan {
  readonly action: 'VOTE' | 'SKIP_TO_ICE';
  readonly finalistCount: number;
}

export function planAfterReview(
  input: RefinementPlanInput,
): RefinementPlan {
  const finalistCount = validateFinalistCount(
    input.finalistCount,
    input.available,
  );

  return {
    action: finalistCount === input.available ? 'SKIP_TO_ICE' : 'VOTE',
    finalistCount,
  };
}
