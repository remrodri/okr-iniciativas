import { describe, expect, it } from 'vitest';

import { SNAPSHOT_FORMAT_VERSION, type SessionSnapshot } from '@/domain/ports';
import { reactivateBackup } from './reactivateBackup';

function importedSnapshot(): SessionSnapshot {
  return {
    localId: 'import-backup-1',
    sessionId: 'old-session',
    revision: 7,
    savedAt: '2026-11-15T10:00:00.000Z',
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    state: {
      session: {
        id: 'old-session',
        version: 7,
        stage: 'EVALUACION_ICE',
        x0: 'Problema',
        xf: 'Solución',
        expectedParticipants: 2,
        initiativesPerParticipant: 1,
        finalistCount: 1,
        finalistIds: ['i-1'],
        tieBreak: null,
        iceConfig: { method: 'MULTIPLICATIVE', weights: null },
        paused: true,
        createdAt: '2026-11-15T08:00:00.000Z',
        updatedAt: '2026-11-15T10:00:00.000Z',
        finalizedAt: '2026-11-15T10:00:00.000Z',
        expiresAt: '2026-11-16T10:00:00.000Z',
      },
      participants: [
        {
          id: 'p-1',
          alias: 'Faro',
          realName: 'Ana',
          accessTokenId: 'old-access-1',
          progress: {
            brainstormingSubmitted: true,
            refinementSubmitted: true,
            tieBreakSubmitted: false,
            iceSubmitted: true,
          },
          connected: true,
        },
        {
          id: 'p-2',
          alias: 'Nexo',
          realName: 'Luis',
          accessTokenId: 'old-access-2',
          progress: {
            brainstormingSubmitted: true,
            refinementSubmitted: true,
            tieBreakSubmitted: false,
            iceSubmitted: false,
          },
          connected: false,
        },
      ],
      initiatives: [
        {
          id: 'i-1',
          text: 'Automatizar',
          authorIds: ['p-1'],
          originals: [],
          status: 'ACTIVE',
          mergedIntoId: null,
          revision: 1,
        },
      ],
      clarifications: [],
      ballots: [
        {
          id: 'ballot-1',
          participantId: 'p-1',
          round: 'REFINEMENT',
          selection: ['i-1'],
          submissionId: 'submitted-vote',
          submittedAt: '2026-11-15T09:00:00.000Z',
        },
      ],
      iceEvaluations: [
        {
          id: 'ice-1',
          participantId: 'p-1',
          ratings: { 'i-1': { impact: 8, confidence: 7, ease: 6 } },
          submissionId: 'submitted-ice',
          submittedAt: '2026-11-15T09:30:00.000Z',
        },
      ],
      ranking: [],
      audit: [],
    },
  };
}

function changingBytes() {
  let seed = 0;
  return (length: number) => {
    seed += 1;
    return new Uint8Array(length).fill(seed);
  };
}

describe('reactivateBackup', () => {
  it('conserva datos y progreso, pero regenera todas las credenciales', async () => {
    const source = importedSnapshot();
    const before = structuredClone(source);
    const result = await reactivateBackup(source, {
      now: '2026-11-15T12:00:00.000Z',
      createSessionId: () => 'new-session',
      randomBytes: changingBytes(),
    });

    expect(source).toEqual(before);
    expect(result.snapshot.sessionId).toBe('new-session');
    expect(result.snapshot.state.session.stage).toBe('EVALUACION_ICE');
    expect(result.snapshot.state.session.finalizedAt).toBeUndefined();
    expect(result.snapshot.state.session.expiresAt).toBeUndefined();
    expect(result.snapshot.state.participants.map(({ progress }) => progress)).toEqual(
      source.state.participants.map(({ progress }) => progress),
    );
    expect(result.snapshot.state.ballots).toEqual(source.state.ballots);
    expect(result.snapshot.state.iceEvaluations).toEqual(source.state.iceEvaluations);
    expect(result.snapshot.state.participants.every(({ connected }) => !connected)).toBe(true);
    expect(result.publicCode).toMatch(/^[A-Z2-9]{8}$/);
    expect(result.facilitatorToken).toMatch(/^[a-f0-9]{64}$/);
    expect(result.participants).toHaveLength(2);
    expect(new Set(result.participants.map(({ token }) => token)).size).toBe(2);
    expect(result.snapshot.state.participants.map(({ accessTokenId }) => accessTokenId)).not.toEqual(
      source.state.participants.map(({ accessTokenId }) => accessTokenId),
    );
  });
});
