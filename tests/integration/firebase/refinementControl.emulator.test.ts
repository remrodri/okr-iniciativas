import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import {
  decideTieRemote,
  openRefinementRemote,
  resolveRefinementRemote,
} from '@/infrastructure/firebase/refinementControl';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = `refinement-${Date.now()}`;
const accessId = `facilitator-${sessionId}`;
const now = '2026-11-14T10:00:00.000Z';

const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `refinement-${Date.now()}`,
});

let testEnv: RulesTestEnvironment;
let facilitatorUid = '';

function initiative(id: string, text: string) {
  return {
    id,
    text,
    status: 'ACTIVE',
    mergedIntoId: null,
    revision: 1,
    createdAt: now,
    updatedAt: now,
  };
}

function ballot(id: string, participantId: string, selection: string[]) {
  return {
    id,
    participantId,
    round: 'REFINEMENT',
    selection,
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
      stage: 'REVISION',
      creatorUid: facilitatorUid,
      finalistCount: null,
      finalistIds: [],
      tieBreak: null,
      expectedParticipants: 2,
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
    await setDoc(
      doc(db, 'sessions', sessionId, 'initiatives', 'i1'),
      initiative('i1', 'Mejorar onboarding'),
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'initiatives', 'i2'),
      initiative('i2', 'Onboarding más rápido'),
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'initiatives', 'i3'),
      initiative('i3', 'Guiar al nuevo ingreso'),
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'ballots', 'p1_REFINEMENT'),
      ballot('p1_REFINEMENT', 'p1', ['i1', 'i2']),
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'ballots', 'p2_REFINEMENT'),
      ballot('p2_REFINEMENT', 'p2', ['i1', 'i3']),
    );
  });
});

afterAll(async () => {
  await testEnv.cleanup();
  await client.dispose();
});

describe('control de depuración y desempate', () => {
  it('abre la depuración con la cantidad N', async () => {
    await openRefinementRemote({
      firestore: client.firestore,
      sessionId,
      finalistCount: 2,
      now: '2026-11-14T10:01:00.000Z',
    });

    const session = await getDoc(doc(client.firestore, 'sessions', sessionId));
    expect(session.data()?.stage).toBe('DEPURACION');
    expect(session.data()?.finalistCount).toBe(2);
  });

  it('persiste empate, decisión y auditoría', async () => {
    const { resolution } = await resolveRefinementRemote({
      firestore: client.firestore,
      sessionId,
      initiativeIds: ['i1', 'i2', 'i3'],
      ballots: [
        ballot('p1_REFINEMENT', 'p1', ['i1', 'i2']),
        ballot('p2_REFINEMENT', 'p2', ['i1', 'i3']),
      ],
      finalistCount: 2,
      now: '2026-11-14T10:02:00.000Z',
    });

    expect(resolution.tie).toEqual({
      candidateIds: ['i2', 'i3'],
      slotsRemaining: 1,
    });

    const tied = await getDoc(doc(client.firestore, 'sessions', sessionId));
    expect(tied.data()?.stage).toBe('DESEMPATE_DEPURACION');
    expect(tied.data()?.tieBreak).toEqual({
      candidateIds: ['i2', 'i3'],
      slotsRemaining: 1,
    });

    await decideTieRemote({
      firestore: client.firestore,
      sessionId,
      tie: resolution.tie ?? { candidateIds: [], slotsRemaining: 0 },
      aboveIds: resolution.finalists,
      selectedIds: ['i3'],
      actorId: facilitatorUid,
      auditId: 'audit-tie',
      now: '2026-11-14T10:03:00.000Z',
    });

    const decided = await getDoc(doc(client.firestore, 'sessions', sessionId));
    expect(decided.data()?.stage).toBe('CONFIGURACION_ICE');
    expect(decided.data()?.finalistIds).toEqual(['i1', 'i3']);
    expect(decided.data()?.tieBreak).toBeNull();

    const audit = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'audit', 'audit-tie'),
    );
    expect(audit.data()?.action).toBe('TIE_DECISION');
  });
});
