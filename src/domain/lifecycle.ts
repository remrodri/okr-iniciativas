import { DomainError } from './errors';
import { LIMITS } from './limits';
import type { Session } from './types';

export const RECOVERY_WINDOW_MS =
  LIMITS.sessionRecoveryHours * 60 * 60 * 1000;

export function finalizeSession(session: Session, now: string): Session {
  const expiresAt = new Date(
    Date.parse(now) + RECOVERY_WINDOW_MS,
  ).toISOString();

  return {
    ...session,
    stage: 'FINALIZADA',
    finalizedAt: now,
    expiresAt,
    version: session.version + 1,
    updatedAt: now,
  };
}

export function isSessionAccessible(session: Session, now: string): boolean {
  if (session.expiresAt === undefined) {
    return true;
  }
  return Date.parse(now) < Date.parse(session.expiresAt);
}

export function reopenSession(session: Session, now: string): Session {
  if (session.stage !== 'FINALIZADA' || session.expiresAt === undefined) {
    throw new DomainError(
      'SESSION_NOT_FINALIZED',
      'Solo se puede reabrir una sesión finalizada.',
      'stage',
    );
  }

  if (!isSessionAccessible(session, now)) {
    throw new DomainError(
      'SESSION_EXPIRED',
      'La sesión expiró y ya no puede reabrirse.',
      'expiresAt',
    );
  }

  const {
    expiresAt: _expiresAt,
    finalizedAt: _finalizedAt,
    ...rest
  } = session;

  return {
    ...rest,
    stage: 'RESULTADO_FINAL',
    version: session.version + 1,
    updatedAt: now,
  };
}
