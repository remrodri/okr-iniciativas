import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import { publishResultsRemote } from '@/infrastructure/firebase/resultsRemote';
import { finalizeRemoteSession } from '@/infrastructure/firebase/sessionLifecycle';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = `results-${Date.now()}`;
const accessId = `facilitator-${sessionId}`;
const now = '2026-11-14T10:00:00.000Z';

const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `results-${Date.now()}`,
});

let testEnv: RulesTestEnvironment;
let facilitatorUid = '';

function evaluation(
  id: string,
  participantId: string,
  ratings: Record<string, { impact: number; confidence: number; ease: number }>,
) {
  return {
    id,
    participantId,
    ratings,
    submissionId: `submission-${id}`,
    submittedAt: now,
  };
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-okr',
    firestore: { host: '127.0.0.1', port: 8080 },
    rules: readFileSync(rulesPath, 'utf8'),
  });
  const credential = await client.signInAnonymously();
  facilitatorUid = credential.user.uid;

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionId), {
      stage: 'EVALUACION_ICE',
      creatorUid: facilitatorUid,
      finalistCount: 2,
      finalistIds: ['i1', 'i2'],
      iceConfig: { method: 'MULTIPLICATIVE', weights: null },
      expectedParticipants: 2,
      initiativesPerParticipant: 1,
      x0: 'X0',
      xf: 'Xf',
      paused: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'access', accessId), {
      sessionId,
      role: 'FACILITATOR',
      participantId: null,
      activeUid: facilitatorUid,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'facilitatorAccess', 'current'),
      { accessId },
    );
    await setDoc(doc(db, 'sessions', sessionId, 'participants', 'p1'), {
      alias: 'Faro',
      activeUid: 'participant-uid-1',
      connected: true,
    });
    await setDoc(doc(db, 'sessions', sessionId, 'participants', 'p2'), {
      alias: 'Luna',
      activeUid: 'participant-uid-2',
      connected: true,
    });
    await setDoc(doc(db, 'sessions', sessionId, 'private', 'p1'), {
      realName: 'Ana',
    });
    await setDoc(doc(db, 'sessions', sessionId, 'private', 'p2'), {
      realName: 'Luis',
    });
    await setDoc(doc(db, 'sessions', sessionId, 'authorship', 'i1'), {
      authorUid: 'participant-uid-1',
      originals: [],
      createdAt: now,
    });
    await setDoc(doc(db, 'sessions', sessionId, 'authorship', 'i2'), {
      authorUid: 'participant-uid-2',
      originals: [],
      createdAt: now,
    });
    await setDoc(doc(db, 'sessions', sessionId, 'initiatives', 'i1'), {
      id: 'i1',
      text: 'Mejorar onboarding',
      status: 'ACTIVE',
      mergedIntoId: null,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(doc(db, 'sessions', sessionId, 'initiatives', 'i2'), {
      id: 'i2',
      text: 'Onboarding más rápido',
      status: 'ACTIVE',
      mergedIntoId: null,
      revision: 1,
      createdAt: now,
      updatedAt: now,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'iceRatings', 'p1'),
      evaluation('p1', 'p1', {
        i1: { impact: 4, confidence: 10, ease: 10 },
        i2: { impact: 2, confidence: 10, ease: 10 },
      }),
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'iceRatings', 'p2'),
      evaluation('p2', 'p2', {
        i1: { impact: 2, confidence: 10, ease: 10 },
        i2: { impact: 3, confidence: 10, ease: 10 },
      }),
    );
  });
});

afterAll(async () => {
  await testEnv.cleanup();
  await client.dispose();
});

describe('publicación y cierre del ranking', () => {
  it('publica solo agregados y la autoría revelada', async () => {
    const ranking = await publishResultsRemote({
      firestore: client.firestore,
      sessionId,
      actorId: facilitatorUid,
      now: '2026-11-14T10:05:00.000Z',
    });

    expect(ranking.map((entry) => entry.initiativeId)).toEqual(['i1', 'i2']);
    expect(ranking.map((entry) => entry.score)).toEqual([300, 250]);

    const session = await getDoc(doc(client.firestore, 'sessions', sessionId));
    expect(session.data()?.stage).toBe('RESULTADO_FINAL');

    const result = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'results', 'ranking'),
    );
    expect(result.data()?.entries).toEqual(ranking);
    expect(result.data()?.authors).toEqual([
      { initiativeId: 'i1', names: ['Ana'] },
      { initiativeId: 'i2', names: ['Luis'] },
    ]);
    expect(result.data()?.entries[0]).not.toHaveProperty('ratings');
    expect(result.data()?.entries[0]).not.toHaveProperty('participantId');

    const facilitatorDb = testEnv
      .authenticatedContext(facilitatorUid)
      .firestore();
    const participantDb = testEnv
      .authenticatedContext('participant-uid-1')
      .firestore();

    await assertSucceeds(
      getDocs(collection(facilitatorDb, 'sessions', sessionId, 'iceRatings')),
    );
    await assertFails(
      getDocs(collection(participantDb, 'sessions', sessionId, 'iceRatings')),
    );
  });

  it('finaliza con un periodo de recuperación visible', async () => {
    const finalized = await finalizeRemoteSession(
      client.firestore,
      sessionId,
      '2026-11-14T10:10:00.000Z',
    );

    expect(finalized.stage).toBe('FINALIZADA');
    expect(finalized.expiresAt).toBe('2026-11-15T10:10:00.000Z');

    const result = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'results', 'ranking'),
    );
    expect(result.data()?.entries).toHaveLength(2);
  });
});

