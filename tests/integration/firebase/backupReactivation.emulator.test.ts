import { doc, getDoc } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

import { SNAPSHOT_FORMAT_VERSION, type SessionSnapshot } from '@/domain/ports';
import { claimParticipantAccess } from '@/infrastructure/firebase/accessClaim';
import { reactivateBackupRemote } from '@/infrastructure/firebase/backupReactivation';
import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';

const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `reactivation-${Date.now()}`,
});

afterAll(async () => client.dispose());

function bytesSource() {
  let value = 10;
  return (length: number) => new Uint8Array(length).fill(value++);
}

function source(): SessionSnapshot {
  const now = '2026-11-15T10:00:00.000Z';
  return {
    localId: 'imported',
    sessionId: 'historical',
    revision: 4,
    savedAt: now,
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    state: {
      session: {
        id: 'historical',
        version: 4,
        stage: 'EVALUACION_ICE',
        x0: 'Problema',
        xf: 'Solución',
        expectedParticipants: 1,
        initiativesPerParticipant: 1,
        finalistCount: 1,
        finalistIds: ['i-1'],
        tieBreak: null,
        iceConfig: { method: 'MULTIPLICATIVE', weights: null },
        paused: false,
        createdAt: now,
        updatedAt: now,
      },
      participants: [
        {
          id: 'p-1',
          alias: 'Faro',
          realName: 'Ana',
          accessTokenId: 'historical-token',
          progress: {
            brainstormingSubmitted: true,
            refinementSubmitted: true,
            tieBreakSubmitted: false,
            iceSubmitted: true,
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
          id: 'p-1_REFINEMENT',
          participantId: 'p-1',
          round: 'REFINEMENT',
          selection: ['i-1'],
          submissionId: 'vote-1',
          submittedAt: now,
        },
      ],
      iceEvaluations: [
        {
          id: 'p-1',
          participantId: 'p-1',
          ratings: { 'i-1': { impact: 8, confidence: 7, ease: 6 } },
          submissionId: 'ice-1',
          submittedAt: now,
        },
      ],
      ranking: [],
      audit: [],
    },
  };
}

describe('reactivación remota de respaldo', () => {
  it('publica la nueva sala solo después de restaurar progreso y envíos', async () => {
    const identity = await client.signInAnonymously();
    const sessionId = `restored-${Date.now()}`;
    const restored = await reactivateBackupRemote({
      firestore: client.firestore,
      creatorUid: identity.user.uid,
      source: source(),
      now: '2026-11-15T12:00:00.000Z',
      createSessionId: () => sessionId,
      randomBytes: bytesSource(),
    });

    const session = await getDoc(doc(client.firestore, 'sessions', sessionId));
    expect(session.data()).toMatchObject({
      stage: 'EVALUACION_ICE',
      restoring: false,
      finalistIds: ['i-1'],
    });
    const participant = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'participants', 'p-1'),
    );
    expect(participant.data()?.progress).toMatchObject({ iceSubmitted: true });

    await claimParticipantAccess({
      firestore: client.firestore,
      token: restored.participants[0]!.token,
      uid: identity.user.uid,
      now: '2026-11-15T12:01:00.000Z',
      expectedSessionId: sessionId,
    });
    const rating = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'iceRatings', 'p-1'),
    );
    expect(rating.data()?.submissionId).toBe('ice-1');
  });
});
