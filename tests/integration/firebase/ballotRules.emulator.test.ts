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
const sessionId = 'session-ballots';
const uidOne = 'participant-one-uid';
const uidTwo = 'participant-two-uid';

let testEnv: RulesTestEnvironment;

async function seed(stage: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionId), {
      stage,
      creatorUid: 'facilitator-uid',
      finalistCount: 1,
      tieBreak: { candidateIds: ['initiative-1'], slotsRemaining: 1 },
    });
    await setDoc(doc(db, 'access', 'facilitator-access-id'), {
      sessionId,
      role: 'FACILITATOR',
      participantId: null,
      activeUid: 'facilitator-uid',
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
      {
        alias: 'Faro',
        activeUid: uidOne,
      },
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'participants', 'participant-2'),
      {
        alias: 'Luna',
        activeUid: uidTwo,
      },
    );
  });
}

const ballot = {
  id: 'participant-1_REFINEMENT',
  participantId: 'participant-1',
  round: 'REFINEMENT',
  selection: ['initiative-1'],
  submissionId: 'submission-1',
  submittedAt: '2026-11-14T10:00:00.000Z',
};

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

describe('reglas de ballots', () => {
  it('permite un voto propio durante depuración y bloquea el ajeno', async () => {
    await seed('DEPURACION');
    const ownDb = testEnv.authenticatedContext(uidOne).firestore();
    const otherDb = testEnv.authenticatedContext(uidTwo).firestore();

    await assertSucceeds(
      setDoc(
        doc(ownDb, 'sessions', sessionId, 'ballots', ballot.id),
        ballot,
      ),
    );
    await assertFails(
      setDoc(
        doc(otherDb, 'sessions', sessionId, 'ballots', 'participant-1_other'),
        { ...ballot, id: 'participant-1_other' },
      ),
    );
    await assertFails(
      getDoc(doc(otherDb, 'sessions', sessionId, 'ballots', ballot.id)),
    );
  });

  it('hace idempotente el reintento y bloquea un voto nuevo', async () => {
    await seed('DEPURACION');
    const db = testEnv.authenticatedContext(uidOne).firestore();
    const ref = doc(db, 'sessions', sessionId, 'ballots', ballot.id);

    await assertSucceeds(setDoc(ref, ballot));
    await assertSucceeds(setDoc(ref, ballot));
    await assertFails(
      updateDoc(ref, {
        selection: ['initiative-2'],
        submissionId: 'submission-2',
      }),
    );
  });

  it('bloquea votos fuera de su etapa', async () => {
    await seed('REVISION');
    const db = testEnv.authenticatedContext(uidOne).firestore();

    await assertFails(
      setDoc(doc(db, 'sessions', sessionId, 'ballots', ballot.id), ballot),
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), 'sessions', sessionId), {
        stage: 'DESEMPATE_DEPURACION',
      });
    });

    await assertFails(
      setDoc(doc(db, 'sessions', sessionId, 'ballots', ballot.id), ballot),
    );
    await assertSucceeds(
      setDoc(
        doc(db, 'sessions', sessionId, 'ballots', 'participant-1_TIEBREAK'),
        { ...ballot, id: 'participant-1_TIEBREAK', round: 'TIEBREAK' },
      ),
    );
  });
});
