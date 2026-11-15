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
  correctInitiativeRemote,
  fuseInitiativesRemote,
  requestClarificationRemote,
} from '@/infrastructure/firebase/reviewActions';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = `review-${Date.now()}`;
const accessId = `facilitator-${sessionId}`;
const now = '2026-11-14T10:00:00.000Z';

const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `review-${Date.now()}`,
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
  });
});

afterAll(async () => {
  await testEnv.cleanup();
  await client.dispose();
});

describe('acciones de revisión', () => {
  it('corrige el texto incrementando la revisión', async () => {
    await correctInitiativeRemote({
      firestore: client.firestore,
      sessionId,
      initiativeId: 'i1',
      text: 'Mejorar el onboarding',
      revision: 1,
      now: '2026-11-14T10:05:00.000Z',
    });

    const snapshot = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'initiatives', 'i1'),
    );
    expect(snapshot.data()?.text).toBe('Mejorar el onboarding');
    expect(snapshot.data()?.revision).toBe(2);
  });

  it('registra una solicitud anónima de aclaración', async () => {
    await requestClarificationRemote({
      firestore: client.firestore,
      sessionId,
      clarificationId: 'c1',
      initiativeId: 'i1',
      message: '¿A qué público se refiere?',
      now: '2026-11-14T10:06:00.000Z',
    });

    const snapshot = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'clarifications', 'c1'),
    );
    expect(snapshot.data()).toMatchObject({
      initiativeId: 'i1',
      status: 'OPEN',
    });
    expect(snapshot.data()?.authorUid).toBeUndefined();
  });

  it('fusiona propuestas conservando la trazabilidad pública', async () => {
    await fuseInitiativesRemote({
      firestore: client.firestore,
      sessionId,
      targetId: 'i1',
      sourceIds: ['i2'],
      mergedText: 'Acelerar el onboarding',
      now: '2026-11-14T10:07:00.000Z',
    });

    const target = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'initiatives', 'i1'),
    );
    const source = await getDoc(
      doc(client.firestore, 'sessions', sessionId, 'initiatives', 'i2'),
    );
    expect(target.data()?.text).toBe('Acelerar el onboarding');
    expect(source.data()?.status).toBe('FUSED');
    expect(source.data()?.mergedIntoId).toBe('i1');
  });
});
