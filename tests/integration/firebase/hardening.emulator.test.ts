import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = 'hardening-session';
const facilitatorUid = 'facilitator-active';
const creatorUid = 'facilitator-original';
const participantUid = 'participant-active';
const nextParticipantUid = 'participant-next';
const facilitatorAccessId = 'secret-facilitator-token-id';
const participantAccessId = 'secret-participant-token-id';

let testEnv: RulesTestEnvironment;

async function seedActiveSession(stage = 'EVALUACION_ICE') {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionId), {
      stage,
      creatorUid,
      version: 1,
      updatedAt: '2026-11-14T10:00:00.000Z',
    });
    await setDoc(doc(db, 'access', facilitatorAccessId), {
      sessionId,
      role: 'FACILITATOR',
      participantId: null,
      activeUid: facilitatorUid,
      createdAt: '2026-11-14T10:00:00.000Z',
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'facilitatorAccess', 'current'),
      { accessId: facilitatorAccessId },
    );
    await setDoc(doc(db, 'access', participantAccessId), {
      sessionId,
      role: 'PARTICIPANT',
      participantId: 'participant-1',
      activeUid: participantUid,
      createdAt: '2026-11-14T10:00:00.000Z',
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'accessMap', 'participant-1'),
      { accessId: participantAccessId },
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'participants', 'participant-1'),
      {
        alias: 'Faro',
        activeUid: participantUid,
        connected: true,
        progress: {},
      },
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

describe('endurecimiento de credenciales y publicación', () => {
  it('oculta los mapas de credenciales y bloquea credenciales posteriores', async () => {
    await seedActiveSession();
    const attackerDb = testEnv.authenticatedContext('attacker').firestore();
    const creatorDb = testEnv.authenticatedContext(creatorUid).firestore();

    await assertFails(
      getDoc(
        doc(
          attackerDb,
          'sessions',
          sessionId,
          'facilitatorAccess',
          'current',
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          attackerDb,
          'sessions',
          sessionId,
          'accessMap',
          'participant-1',
        ),
      ),
    );
    await assertFails(
      setDoc(doc(creatorDb, 'access', 'new-secret'), {
        sessionId,
        role: 'FACILITATOR',
        participantId: null,
        activeUid: null,
        createdAt: '2026-11-14T11:00:00.000Z',
      }),
    );
  });

  it('exige reasignar access y participant en la misma transacción', async () => {
    await seedActiveSession();
    const nextDb = testEnv.authenticatedContext(nextParticipantUid).firestore();
    const accessRef = doc(nextDb, 'access', participantAccessId);
    const participantRef = doc(
      nextDb,
      'sessions',
      sessionId,
      'participants',
      'participant-1',
    );

    await assertFails(
      updateDoc(accessRef, {
        activeUid: nextParticipantUid,
        claimedAt: '2026-11-14T11:00:00.000Z',
      }),
    );

    const batch = writeBatch(nextDb);
    batch.update(accessRef, {
      activeUid: nextParticipantUid,
      claimedAt: '2026-11-14T11:00:00.000Z',
    });
    batch.update(participantRef, { activeUid: nextParticipantUid });
    await assertSucceeds(batch.commit());

    const previousDb = testEnv.authenticatedContext(participantUid).firestore();
    await assertFails(
      updateDoc(
        doc(
          previousDb,
          'sessions',
          sessionId,
          'participants',
          'participant-1',
        ),
        { connected: false },
      ),
    );
  });

  it('exige publicar ranking y etapa en una operación atómica', async () => {
    await seedActiveSession();
    const db = testEnv.authenticatedContext(facilitatorUid).firestore();
    const sessionRef = doc(db, 'sessions', sessionId);
    const resultsRef = doc(
      db,
      'sessions',
      sessionId,
      'results',
      'ranking',
    );

    await assertFails(updateDoc(sessionRef, { stage: 'RESULTADO_FINAL' }));
    await assertFails(
      setDoc(resultsRef, {
        entries: [],
        authors: [],
        publishedAt: '2026-11-14T11:00:00.000Z',
      }),
    );

    const batch = writeBatch(db);
    batch.update(sessionRef, {
      stage: 'RESULTADO_FINAL',
      version: 2,
      updatedAt: '2026-11-14T11:00:00.000Z',
    });
    batch.set(resultsRef, {
      entries: [],
      authors: [],
      publishedAt: '2026-11-14T11:00:00.000Z',
    });
    await assertSucceeds(batch.commit());
  });

  it('bloquea datos privados y resultados después de expirar', async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'sessions', sessionId), {
        stage: 'FINALIZADA',
        creatorUid,
        expiresAtMillis: 1,
      });
      await setDoc(doc(db, 'sessions', sessionId, 'results', 'ranking'), {
        entries: [],
      });
      await setDoc(doc(db, 'sessions', sessionId, 'private', 'participant-1'), {
        realName: 'Ana',
      });
      await setDoc(doc(db, 'sessions', sessionId, 'authorship', 'initiative-1'), {
        authorUid: participantUid,
      });
      await setDoc(doc(db, 'sessions', sessionId, 'originals', 'original-1'), {
        text: 'Idea original',
      });
    });

    const db = testEnv.authenticatedContext('reader').firestore();
    for (const path of [
      ['results', 'ranking'],
      ['private', 'participant-1'],
      ['authorship', 'initiative-1'],
      ['originals', 'original-1'],
    ] as const) {
      await assertFails(
        getDoc(doc(db, 'sessions', sessionId, path[0], path[1])),
      );
    }
  });
});
