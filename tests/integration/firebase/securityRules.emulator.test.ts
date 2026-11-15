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
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');

const sessionId = 'session-rules';
const facilitatorUid = 'facilitator-uid';
const participantUid = 'participant-uid';

let testEnv: RulesTestEnvironment;

async function seed(sessionIdToSeed: string, stage: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionIdToSeed), {
      stage,
      creatorUid: facilitatorUid,
      x0: 'X0',
      xf: 'Xf',
      expectedParticipants: 2,
      initiativesPerParticipant: 1,
      finalistCount: null,
      iceConfig: null,
      paused: false,
      version: 1,
      createdAt: '2026-11-14T10:00:00.000Z',
      updatedAt: '2026-11-14T10:00:00.000Z',
    });
    await setDoc(doc(db, 'access', 'facilitator-access-id'), {
      sessionId: sessionIdToSeed,
      role: 'FACILITATOR',
      participantId: null,
      activeUid: facilitatorUid,
      createdAt: '2026-11-14T10:00:00.000Z',
    });
    await setDoc(
      doc(db, 'sessions', sessionIdToSeed, 'facilitatorAccess', 'current'),
      { accessId: 'facilitator-access-id' },
    );
    await setDoc(doc(db, 'access', 'participant-access-id'), {
      sessionId: sessionIdToSeed,
      role: 'PARTICIPANT',
      participantId: 'participant-1',
      activeUid: participantUid,
      createdAt: '2026-11-14T10:00:00.000Z',
    });
    await setDoc(
      doc(db, 'sessions', sessionIdToSeed, 'accessMap', 'participant-1'),
      { accessId: 'participant-access-id' },
    );
    await setDoc(
      doc(db, 'sessions', sessionIdToSeed, 'participants', 'participant-1'),
      {
        alias: 'Faro',
        connected: true,
        activeUid: participantUid,
        progress: {
          brainstormingSubmitted: false,
          refinementSubmitted: false,
          tieBreakSubmitted: false,
          iceSubmitted: false,
        },
      },
    );
    await setDoc(
      doc(db, 'sessions', sessionIdToSeed, 'private', 'participant-1'),
      { realName: 'Ana' },
    );
    await setDoc(
      doc(db, 'sessions', sessionIdToSeed, 'originals', 'original-1'),
      { text: 'Idea original', authorId: 'participant-1' },
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

describe('reglas base y proyecciones privadas', () => {
  it('deniega todo sin autenticación', async () => {
    await seed(sessionId, 'REVISION');
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, 'sessions', sessionId)));
    await assertFails(getDoc(doc(db, 'sessionCodes', 'ABCD2345')));
  });

  it('permite leer la sesión pero no listar accesos', async () => {
    await seed(sessionId, 'REVISION');
    const db = testEnv.authenticatedContext(participantUid).firestore();

    await assertSucceeds(getDoc(doc(db, 'sessions', sessionId)));
    await assertFails(getDocs(collection(db, 'access')));
  });

  it('oculta nombres y autoría antes del resultado final', async () => {
    await seed(sessionId, 'REVISION');
    const db = testEnv.authenticatedContext(participantUid).firestore();

    await assertFails(
      getDoc(doc(db, 'sessions', sessionId, 'private', 'participant-1')),
    );
    await assertFails(
      getDoc(doc(db, 'sessions', sessionId, 'originals', 'original-1')),
    );
  });

  it('revela nombres y autoría al publicar el resultado final', async () => {
    await seed(sessionId, 'RESULTADO_FINAL');
    const db = testEnv.authenticatedContext(facilitatorUid).firestore();

    await assertSucceeds(
      getDoc(doc(db, 'sessions', sessionId, 'private', 'participant-1')),
    );
    await assertSucceeds(
      getDoc(doc(db, 'sessions', sessionId, 'originals', 'original-1')),
    );
  });

  it('solo el facilitador cambia la sesión', async () => {
    await seed(sessionId, 'REVISION');
    const participantDb = testEnv
      .authenticatedContext(participantUid)
      .firestore();
    const facilitatorDb = testEnv
      .authenticatedContext(facilitatorUid)
      .firestore();

    await assertFails(
      updateDoc(doc(participantDb, 'sessions', sessionId), {
        stage: 'DEPURACION',
      }),
    );
    await assertSucceeds(
      updateDoc(doc(facilitatorDb, 'sessions', sessionId), {
        stage: 'DEPURACION',
      }),
    );
  });
});

describe('endurecimiento de credenciales y publicación atómica', () => {
  it('deniega datos sensibles y credenciales al expirar', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'sessions', sessionId), {
        stage: 'FINALIZADA',
        creatorUid: facilitatorUid,
        expiresAtMillis: 1,
      });
      await setDoc(doc(db, 'access', 'participant-access-id'), {
        sessionId,
        role: 'PARTICIPANT',
        participantId: 'participant-1',
        activeUid: participantUid,
      });
      await setDoc(
        doc(db, 'sessions', sessionId, 'participants', 'participant-1'),
        { alias: 'Faro', activeUid: participantUid },
      );
      await setDoc(
        doc(db, 'sessions', sessionId, 'accessMap', 'participant-1'),
        { accessId: 'participant-access-id' },
      );
      await setDoc(
        doc(db, 'sessions', sessionId, 'private', 'participant-1'),
        { realName: 'Ana' },
      );
      await setDoc(
        doc(db, 'sessions', sessionId, 'originals', 'original-1'),
        { text: 'Idea original' },
      );
      await setDoc(
        doc(db, 'sessions', sessionId, 'authorship', 'initiative-1'),
        { authorUid: participantUid },
      );
      await setDoc(
        doc(db, 'sessions', sessionId, 'results', 'ranking'),
        { entries: [] },
      );
      await setDoc(
        doc(db, 'sessions', sessionId, 'ballots', 'ballot-1'),
        { participantId: 'participant-1' },
      );
      await setDoc(
        doc(db, 'sessions', sessionId, 'iceRatings', 'rating-1'),
        { participantId: 'participant-1' },
      );
    });

    const db = testEnv.authenticatedContext(participantUid).firestore();
    await assertFails(
      getDoc(doc(db, 'sessions', sessionId, 'private', 'participant-1')),
    );
    await assertFails(
      getDoc(doc(db, 'sessions', sessionId, 'originals', 'original-1')),
    );
    await assertFails(
      getDoc(doc(db, 'sessions', sessionId, 'authorship', 'initiative-1')),
    );
    await assertFails(
      getDoc(doc(db, 'sessions', sessionId, 'results', 'ranking')),
    );
    await assertFails(
      updateDoc(doc(db, 'access', 'participant-access-id'), {
        activeUid: 'otro-uid',
      }),
    );
  });

  it('exige publicar resultados y cambiar la etapa en la misma operación', async () => {
    await seed(sessionId, 'EVALUACION_ICE');
    const db = testEnv.authenticatedContext(facilitatorUid).firestore();
    const resultsRef = doc(db, 'sessions', sessionId, 'results', 'ranking');

    await assertFails(setDoc(resultsRef, { entries: [] }));

    const batch = writeBatch(db);
    batch.update(doc(db, 'sessions', sessionId), {
      stage: 'RESULTADO_FINAL',
    });
    batch.set(resultsRef, { entries: [] });
    await assertSucceeds(batch.commit());
  });
});
