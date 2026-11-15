import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import {
  finalizeSession,
  isSessionAccessible,
  RECOVERY_WINDOW_MS,
  reopenSession,
} from './lifecycle';
import type { Session } from './types';

const now = '2026-11-14T10:00:00.000Z';

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    version: 5,
    stage: 'RESULTADO_FINAL',
    x0: 'X0',
    xf: 'Xf',
    expectedParticipants: 6,
    initiativesPerParticipant: 5,
    finalistCount: 15,
    iceConfig: { method: 'MULTIPLICATIVE', weights: null },
    paused: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ciclo de vida de la sesión', () => {
  it('finaliza y calcula un periodo de recuperación de 24 horas', () => {
    const finalized = finalizeSession(session(), now);

    expect(finalized.stage).toBe('FINALIZADA');
    expect(finalized.finalizedAt).toBe(now);
    expect(finalized.expiresAt).toBe(
      new Date(Date.parse(now) + RECOVERY_WINDOW_MS).toISOString(),
    );
    expect(RECOVERY_WINDOW_MS).toBe(24 * 60 * 60 * 1000);
    expect(finalized.version).toBe(6);
  });

  it('mantiene el acceso durante el periodo y lo deniega al vencer', () => {
    const finalized = finalizeSession(session(), now);
    const expiresAt = finalized.expiresAt as string;

    expect(isSessionAccessible(finalized, '2026-11-15T09:59:59.999Z')).toBe(
      true,
    );
    expect(isSessionAccessible(finalized, expiresAt)).toBe(false);
    expect(isSessionAccessible(finalized, '2026-11-16T00:00:00.000Z')).toBe(
      false,
    );
  });

  it('permite reabrir antes del vencimiento y cancela la eliminación', () => {
    const finalized = finalizeSession(session(), now);
    const reopened = reopenSession(finalized, '2026-11-15T09:00:00.000Z');

    expect(reopened.stage).toBe('RESULTADO_FINAL');
    expect(reopened.expiresAt).toBeUndefined();
    expect(reopened.finalizedAt).toBeUndefined();
    expect(isSessionAccessible(reopened, '2026-11-16T00:00:00.000Z')).toBe(
      true,
    );
  });

  it('deniega reabrir una sesión vencida', () => {
    const finalized = finalizeSession(session(), now);

    try {
      reopenSession(finalized, '2026-11-15T10:00:00.000Z');
      throw new Error('Se esperaba un error.');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe('SESSION_EXPIRED');
    }
  });

  it('solo reabre sesiones finalizadas', () => {
    try {
      reopenSession(session({ stage: 'RESULTADO_FINAL' }), now);
      throw new Error('Se esperaba un error.');
    } catch (error) {
      expect((error as DomainError).code).toBe('SESSION_NOT_FINALIZED');
    }
  });
});
