import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import {
  assertIceConfigEditable,
  createIceConfig,
  validateIceWeights,
} from './iceConfig';

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

describe('configuración ICE', () => {
  it('crea el método multiplicativo sin pesos', () => {
    expect(createIceConfig({ method: 'MULTIPLICATIVE' })).toEqual({
      method: 'MULTIPLICATIVE',
      weights: null,
    });
  });

  it('acepta pesos que suman exactamente 100 %', () => {
    const weights = { impact: 0.5, confidence: 0.25, ease: 0.25 };

    expect(validateIceWeights(weights)).toEqual(weights);
    expect(createIceConfig({ method: 'WEIGHTED', weights })).toEqual({
      method: 'WEIGHTED',
      weights,
    });
  });

  it('acepta pesos decimales exactos distintos de los ejemplos', () => {
    expect(() =>
      validateIceWeights({ impact: 0.1, confidence: 0.1, ease: 0.8 }),
    ).not.toThrow();
    expect(() =>
      validateIceWeights({ impact: 0.3333, confidence: 0.3333, ease: 0.3334 }),
    ).not.toThrow();
  });

  it('rechaza sumas distintas de 100 %', () => {
    expect(
      codeOf(() =>
        validateIceWeights({ impact: 0.5, confidence: 0.2, ease: 0.2 }),
      ),
    ).toBe('INVALID_ICE_WEIGHTS');
    expect(
      codeOf(() =>
        validateIceWeights({ impact: 0.5, confidence: 0.25, ease: 0.3 }),
      ),
    ).toBe('INVALID_ICE_WEIGHTS');
  });

  it('rechaza pesos negativos, no finitos o con exceso de decimales', () => {
    expect(
      codeOf(() =>
        validateIceWeights({ impact: -0.5, confidence: 0.75, ease: 0.75 }),
      ),
    ).toBe('INVALID_ICE_WEIGHTS');
    expect(
      codeOf(() =>
        validateIceWeights({ impact: Number.NaN, confidence: 0.5, ease: 0.5 }),
      ),
    ).toBe('INVALID_ICE_WEIGHTS');
    expect(
      codeOf(() =>
        validateIceWeights({ impact: 0.33333, confidence: 0.33333, ease: 0.33334 }),
      ),
    ).toBe('INVALID_ICE_WEIGHTS');
  });

  it('exige pesos al elegir el método ponderado', () => {
    expect(codeOf(() => createIceConfig({ method: 'WEIGHTED' }))).toBe(
      'INVALID_ICE_WEIGHTS',
    );
  });

  it('bloquea la configuración al comenzar la evaluación', () => {
    expect(() => assertIceConfigEditable('CONFIGURACION_ICE')).not.toThrow();
    expect(codeOf(() => assertIceConfigEditable('EVALUACION_ICE'))).toBe(
      'ICE_CONFIG_LOCKED',
    );
    expect(codeOf(() => assertIceConfigEditable('RESULTADO_FINAL'))).toBe(
      'ICE_CONFIG_LOCKED',
    );
  });
});
