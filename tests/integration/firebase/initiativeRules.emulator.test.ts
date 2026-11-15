import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = 'session-initiatives';
const facilitatorUid = 'facilitator-uid';
const authorUid = 'author-uid';
const otherUid = 'other-uid';

let testEnv: RulesTestEnvironment;

const publicInitiative = {
  id: 'initiative-1',
  text: 'Idea original',
  status: 'ACTIVE',
  mergedIntoId: null,
  revision: 1,
  createdAt: '2026-11-14T10:00:00.000Z',
  updatedAt: '2026-11-14T10:00:00.000Z',
};

async function seed(stage: string) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionId), {
      stage,
      creatorUid: facilitatorUid,
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
    await setDoc(
      doc(db, 'sessions', sessionId, 'initiatives', 'initiative-1'),
      publicInitiative,
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'authorship', 'initiative-1'),
      {
        authorUid,
        originals: [],
        createdAt: '2026-11-14T10:00:00.000Z',
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

describe('reglas por etapa para iniciativas', () => {
  it('permite crear una iniciativa y su autoría durante brainstorming', async () => {
    await seed('BRAINSTORMING');
    const db = testEnv.authenticatedContext(authorUid).firestore();

    await assertSucceeds(
      setDoc(doc(db, 'sessions', sessionId, 'initiatives', 'initiative-2'), {
        ...publicInitiative,
        id: 'initiative-2',
      }),
    );
    await assertSucceeds(
      setDoc(doc(db, 'sessions', sessionId, 'authorship', 'initiative-2'), {
        authorUid,
        originals: [],
        createdAt: '2026-11-14T10:00:00.000Z',
      }),
    );
  });

  it('niega campos de autoría en la iniciativa pública', async () => {
    await seed('BRAINSTORMING');
    const db = testEnv.authenticatedContext(authorUid).firestore();

    await assertFails(
      setDoc(doc(db, 'sessions', sessionId, 'initiatives', 'initiative-3'), {
        ...publicInitiative,
        id: 'initiative-3',
        authorIds: [authorUid],
      }),
    );
  });

  it('niega cambios ajenos y fuera de etapa', async () => {
    await seed('BRAINSTORMING');
    const otherDb = testEnv.authenticatedContext(otherUid).firestore();
    const authorDb = testEnv.authenticatedContext(authorUid).firestore();

    await assertFails(
      updateDoc(
        doc(otherDb, 'sessions', sessionId, 'initiatives', 'initiative-1'),
        { text: 'Secuestrada', revision: 2 },
      ),
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(context.firestore(), 'sessions', sessionId),
        { stage: 'DEPURACION' },
      );
    });

    await assertFails(
      updateDoc(
        doc(authorDb, 'sessions', sessionId, 'initiatives', 'initiative-1'),
        { text: 'Tarde', revision: 2 },
      ),
    );
  });

  it('permite al facilitador corregir durante revisión sin tocar autoría', async () => {
    await seed('REVISION');
    const db = testEnv.authenticatedContext(facilitatorUid).firestore();

    await assertSucceeds(
      updateDoc(
        doc(db, 'sessions', sessionId, 'initiatives', 'initiative-1'),
        {
          text: 'Idea corregida',
          revision: 2,
          updatedAt: '2026-11-14T10:05:00.000Z',
        },
      ),
    );

    await assertFails(
      updateDoc(
        doc(db, 'sessions', sessionId, 'initiatives', 'initiative-1'),
        { authorIds: [authorUid], revision: 3 },
      ),
    );
  });

  it('registra solicitudes de aclaración sin autor', async () => {
    await seed('REVISION');
    const db = testEnv.authenticatedContext(facilitatorUid).firestore();

    await assertSucceeds(
      setDoc(
        doc(db, 'sessions', sessionId, 'clarifications', 'clarification-1'),
        {
          id: 'clarification-1',
          initiativeId: 'initiative-1',
          message: '¿Qué alcance tiene?',
          status: 'OPEN',
          createdAt: '2026-11-14T10:00:00.000Z',
        },
      ),
    );
    await assertFails(
      setDoc(
        doc(db, 'sessions', sessionId, 'clarifications', 'clarification-2'),
        {
          id: 'clarification-2',
          initiativeId: 'initiative-1',
          message: 'Con autor',
          status: 'OPEN',
          createdAt: '2026-11-14T10:00:00.000Z',
          authorUid,
        },
      ),
    );
  });
});
