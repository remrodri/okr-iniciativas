import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = 'session-ice';
const uidOne = 'participant-one-uid';
const uidTwo = 'participant-two-uid';
const facilitatorUid = 'facilitator-uid';

let testEnv: RulesTestEnvironment;

const rating = {
  id: 'participant-1',
  participantId: 'participant-1',
  ratings: {
    'initiative-1': { impact: 8, confidence: 7, ease: 6 },
  },
  submissionId: 'submission-1',
  submittedAt: '2026-11-14T10:00:00.000Z',
};

async function seed(stage: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionId), {
      stage,
      creatorUid: facilitatorUid,
      finalistIds: ['initiative-1'],
    });
    await setDoc(doc(db, 'access', 'facilitator-access-id'), {
      sessionId,
      role: 'FACILITATOR',
      participantId: null,
      activeUid: facilitatorUid,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'facilitatorAccess', 'current'),
      { accessId: 'facilitator-access-id' },
    );
    await setDoc(doc(db, 'access', 'access-one'), {
      sessionId,
      role: 'PARTICIPANT',
      participantId: 'participant-1',
      activeUid: uidOne,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'accessMap', 'participant-1'),
      { accessId: 'access-one' },
    );
    await setDoc(doc(db, 'access', 'access-two'), {
      sessionId,
      role: 'PARTICIPANT',
      participantId: 'participant-2',
      activeUid: uidTwo,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'accessMap', 'participant-2'),
      { accessId: 'access-two' },
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'participants', 'participant-1'),
      { alias: 'Faro', activeUid: uidOne },
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'participants', 'participant-2'),
      { alias: 'Luna', activeUid: uidTwo },
    );
  });
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-okr',
    firestore: { host: '127.0.0.1', port: 8080 },
    rules: readFileSync(rulesPath, 'utf8'),
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('reglas de evaluaciones ICE y resultados', () => {
  it('oculta evaluaciones individuales mientras están abiertas', async () => {
    await seed('EVALUACION_ICE');
    const ownDb = testEnv.authenticatedContext(uidOne).firestore();
    const otherDb = testEnv.authenticatedContext(uidTwo).firestore();

    await assertSucceeds(
      setDoc(doc(ownDb, 'sessions', sessionId, 'iceRatings', rating.id), rating),
    );
    await assertSucceeds(
      getDoc(doc(ownDb, 'sessions', sessionId, 'iceRatings', rating.id)),
    );
    await assertFails(
      getDoc(doc(otherDb, 'sessions', sessionId, 'iceRatings', rating.id)),
    );
    await assertFails(
      setDoc(
        doc(otherDb, 'sessions', sessionId, 'iceRatings', rating.id),
        rating,
      ),
    );
  });

  it('bloquea calificar fuera de etapa y cambiar la evaluación', async () => {
    await seed('CONFIGURACION_ICE');
    const db = testEnv.authenticatedContext(uidOne).firestore();
    const ref = doc(db, 'sessions', sessionId, 'iceRatings', rating.id);

    await assertFails(setDoc(ref, rating));

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'sessions', sessionId), {
        stage: 'EVALUACION_ICE',
      });
    });
    await assertSucceeds(setDoc(ref, rating));
    await assertFails(
      updateDoc(ref, {
        ratings: { 'initiative-1': { impact: 1, confidence: 1, ease: 1 } },
        submissionId: 'submission-2',
      }),
    );
  });

  it('publica solo agregados tras el cierre', async () => {
    await seed('EVALUACION_ICE');
    const facilitatorDb = testEnv
      .authenticatedContext(facilitatorUid)
      .firestore();
    const participantDb = testEnv
      .authenticatedContext(uidOne)
      .firestore();
    const resultRef = doc(
      facilitatorDb,
      'sessions',
      sessionId,
      'results',
      'ranking',
    );

    await assertFails(
      setDoc(resultRef, { entries: [], publishedAt: '2026-11-14T10:00:00Z' }),
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'sessions', sessionId), {
        stage: 'RESULTADO_FINAL',
      });
    });

    await assertSucceeds(
      setDoc(resultRef, { entries: [], publishedAt: '2026-11-14T10:00:00Z' }),
    );
    await assertSucceeds(
      getDoc(
        doc(participantDb, 'sessions', sessionId, 'results', 'ranking'),
      ),
    );
  });
});
