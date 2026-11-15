import { describe, expect, it } from 'vitest';

import {
  assertInitiativeCountPerParticipant,
  assertInitiativeText,
  assertParticipantConfigCount,
  assertScenarioText,
  LIMITS,
} from './limits';
import { DomainError } from './errors';
import type { Initiative, Session } from './types';

function captureError(action: () => unknown): DomainError {
  try {
    action();
  } catch (error) {
    if (error instanceof DomainError) {
      return error;
    }
    throw error;
  }
  throw new Error('Se esperaba un DomainError.');
}

describe('tipos del dominio', () => {
  it('acepta una sesión y una iniciativa válidas', () => {
    const session = {
      id: 's1',
      version: 1,
      stage: 'CONFIGURACION',
      x0: 'Situación actual',
      xf: 'Situación deseada',
      expectedParticipants: 6,
      initiativesPerParticipant: 5,
      finalistCount: null,
      iceConfig: null,
      paused: false,
      createdAt: '2026-11-14T00:00:00.000Z',
      updatedAt: '2026-11-14T00:00:00.000Z',
    } satisfies Session;

    const initiative = {
      id: 'i1',
      text: 'Mejorar el onboarding',
      authorIds: ['p1'],
      originals: [],
      status: 'ACTIVE',
      mergedIntoId: null,
      revision: 1,
    } satisfies Initiative;

    expect(session.stage).toBe('CONFIGURACION');
    expect(initiative.status).toBe('ACTIVE');
  });
});

describe('límites del dominio', () => {
  it('acepta textos dentro del rango y recorta espacios', () => {
    expect(assertScenarioText('  meta  ', 'xf')).toBe('meta');
    expect(assertInitiativeText('  idea  ')).toBe('idea');
  });

  it('rechaza textos vacíos o demasiado largos con error tipado', () => {
    const empty = captureError(() => assertScenarioText('   ', 'x0'));
    expect(empty.code).toBe('INVALID_SCENARIO_TEXT');
    expect(empty.field).toBe('x0');

    const tooLong = captureError(() =>
      assertInitiativeText('a'.repeat(LIMITS.initiativeTextMax + 1)),
    );
    expect(tooLong.code).toBe('INVALID_INITIATIVE_TEXT');
  });

  it('rechaza cantidades fuera de rango', () => {
    expect(captureError(() => assertParticipantConfigCount(0)).code).toBe(
      'INVALID_PARTICIPANT_COUNT',
    );
    expect(captureError(() => assertParticipantConfigCount(41)).code).toBe(
      'INVALID_PARTICIPANT_COUNT',
    );
    expect(
      captureError(() => assertInitiativeCountPerParticipant(11)).code,
    ).toBe('INVALID_INITIATIVES_PER_PARTICIPANT');
  });

  it('acepta los límites máximos documentados', () => {
    expect(assertParticipantConfigCount(40)).toBe(40);
    expect(assertInitiativeCountPerParticipant(10)).toBe(10);
    expect(assertScenarioText('x'.repeat(1000), 'x0')).toHaveLength(1000);
  });
});
