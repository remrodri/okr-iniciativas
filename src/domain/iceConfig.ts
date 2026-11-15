import { DomainError } from './errors';
import type { IceConfig, IceMethod, IceWeights, SessionStage } from './types';

export const ICE_WEIGHT_SCALE = 10_000;

export interface IceConfigInput {
  readonly method: IceMethod;
  readonly weights?: IceWeights | null;
}

function toExactScale(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new DomainError(
      'INVALID_ICE_WEIGHTS',
      'Los pesos deben ser números no negativos.',
      field,
    );
  }

  const scaled = Math.round(value * ICE_WEIGHT_SCALE);
  if (Math.abs(value * ICE_WEIGHT_SCALE - scaled) > 1e-9) {
    throw new DomainError(
      'INVALID_ICE_WEIGHTS',
      'Los pesos admiten como máximo cuatro decimales.',
      field,
    );
  }

  return scaled;
}

export function validateIceWeights(weights: IceWeights): IceWeights {
  const impact = toExactScale(weights.impact, 'impact');
  const confidence = toExactScale(weights.confidence, 'confidence');
  const ease = toExactScale(weights.ease, 'ease');

  if (impact + confidence + ease !== ICE_WEIGHT_SCALE) {
    throw new DomainError(
      'INVALID_ICE_WEIGHTS',
      'Los pesos deben sumar exactamente 100 %.',
      'weights',
    );
  }

  return {
    impact: weights.impact,
    confidence: weights.confidence,
    ease: weights.ease,
  };
}

export function createIceConfig(input: IceConfigInput): IceConfig {
  if (input.method === 'MULTIPLICATIVE') {
    return { method: 'MULTIPLICATIVE', weights: null };
  }

  if (input.weights === undefined || input.weights === null) {
    throw new DomainError(
      'INVALID_ICE_WEIGHTS',
      'El método ponderado requiere pesos.',
      'weights',
    );
  }

  return {
    method: 'WEIGHTED',
    weights: validateIceWeights(input.weights),
  };
}

const LOCKED_STAGES: ReadonlySet<SessionStage> = new Set([
  'EVALUACION_ICE',
  'RESULTADO_FINAL',
  'FINALIZADA',
]);

export function assertIceConfigEditable(stage: SessionStage): void {
  if (LOCKED_STAGES.has(stage)) {
    throw new DomainError(
      'ICE_CONFIG_LOCKED',
      'El método ICE queda bloqueado al comenzar la evaluación.',
      'stage',
    );
  }
}
