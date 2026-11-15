import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import { validateSessionConfig } from './sessionConfig';

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

const validInput = {
  x0: '  Hoy no hay onboarding  ',
  xf: '  Cada persona se activa en un día  ',
  expectedParticipants: 6,
  initiativesPerParticipant: 5,
} as const;

describe('validateSessionConfig', () => {
  it('normaliza textos y calcula el total esperado', () => {
    const config = validateSessionConfig(validInput);

    expect(config.x0).toBe('Hoy no hay onboarding');
    expect(config.xf).toBe('Cada persona se activa en un día');
    expect(config.totalInitiatives).toBe(30);
  });

  it('rechaza X0 y Xf vacíos', () => {
    expect(
      codeOf(() => validateSessionConfig({ ...validInput, x0: '  ' })),
    ).toBe('INVALID_SCENARIO_TEXT');
    expect(
      codeOf(() => validateSessionConfig({ ...validInput, xf: '' })),
    ).toBe('INVALID_SCENARIO_TEXT');
  });

  it('rechaza cantidades de participantes fuera de 1..40', () => {
    expect(
      codeOf(() =>
        validateSessionConfig({ ...validInput, expectedParticipants: 0 }),
      ),
    ).toBe('INVALID_PARTICIPANT_COUNT');
    expect(
      codeOf(() =>
        validateSessionConfig({ ...validInput, expectedParticipants: 41 }),
      ),
    ).toBe('INVALID_PARTICIPANT_COUNT');
  });

  it('rechaza iniciativas por participante fuera de 1..10', () => {
    expect(
      codeOf(() =>
        validateSessionConfig({ ...validInput, initiativesPerParticipant: 0 }),
      ),
    ).toBe('INVALID_INITIATIVES_PER_PARTICIPANT');
    expect(
      codeOf(() =>
        validateSessionConfig({ ...validInput, initiativesPerParticipant: 11 }),
      ),
    ).toBe('INVALID_INITIATIVES_PER_PARTICIPANT');
  });

  it('acepta el máximo de 40 x 10 sin superar 400', () => {
    const config = validateSessionConfig({
      ...validInput,
      expectedParticipants: 40,
      initiativesPerParticipant: 10,
    });

    expect(config.totalInitiatives).toBe(400);
  });
});
