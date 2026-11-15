import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  respondToClarificationRemote,
  submitInitiativesRemote,
} from '@/infrastructure/firebase/participantInitiatives';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = `initiative-submission-${Date.now()}`;
const participantId = 'participant-one';
const participantUid = 'participant-one-uid';
const accessId = 'participant-one-access';
const now = '2026-11-14T10:00:00.000Z';
let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-okr',
    firestore: { host: '127.0.0.1', port: 8080 },
    rules: readFileSync(rulesPath, 'utf8'),
  });
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'sessions', sessionId), {
      stage: 'BRAINSTORMING',
      initiativesPerParticipant: 2,
      creatorUid: 'facilitator',
    });
    await setDoc(doc(db, 'access', accessId), {
      sessionId,
      role: 'PARTICIPANT',
      participantId,
      activeUid: participantUid,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'accessMap', participantId),
      { accessId },
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'participants', participantId),
      {
        alias: 'Faro',
        activeUid: participantUid,
        connected: true,
        progress: {
          brainstormingSubmitted: false,
          refinementSubmitted: false,
          tieBreakSubmitted: false,
          iceSubmitted: false,
        },
      },
    );
  });
});

afterAll(async () => testEnv.cleanup());

describe('envío de iniciativas y aclaraciones', () => {
  it('envía exactamente la cantidad configurada y el reintento es idempotente', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    const input = {
      firestore: db,
      sessionId,
      participantId,
      texts: ['Primera iniciativa', 'Segunda iniciativa'],
      now,
    };

    const firstIds = await submitInitiativesRemote(input);
    const retryIds = await submitInitiativesRemote(input);

    expect(firstIds).toEqual([`${participantId}-1`, `${participantId}-2`]);
    expect(retryIds).toEqual(firstIds);
    expect(
      (await getDocs(collection(db, 'sessions', sessionId, 'initiatives')))
        .size,
    ).toBe(2);
    expect(
      (
        await getDoc(
          doc(db, 'sessions', sessionId, 'participants', participantId),
        )
      ).data()?.progress.brainstormingSubmitted,
    ).toBe(true);
  });

  it('rechaza una cantidad distinta y permite al autor responder en revisión', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    await expect(
      submitInitiativesRemote({
        firestore: db,
        sessionId,
        participantId,
        texts: ['Sólo una'],
        now,
      }),
    ).rejects.toThrow('Debes enviar exactamente 2 iniciativas.');

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const admin = context.firestore();
      await setDoc(
        doc(admin, 'sessions', sessionId),
        { stage: 'REVISION', initiativesPerParticipant: 2, creatorUid: 'facilitator' },
      );
      await setDoc(
        doc(admin, 'sessions', sessionId, 'clarifications', 'clarification-1'),
        {
          id: 'clarification-1',
          initiativeId: `${participantId}-1`,
          message: '¿Cuál es el alcance?',
          status: 'OPEN',
          createdAt: now,
        },
      );
    });

    await respondToClarificationRemote({
      firestore: db,
      sessionId,
      clarificationId: 'clarification-1',
      responseText: 'Aplica a toda el área.',
    });
    expect(
      (
        await getDoc(
          doc(
            db,
            'sessions',
            sessionId,
            'clarifications',
            'clarification-1',
          ),
        )
      ).data(),
    ).toMatchObject({ status: 'RESOLVED', responseText: 'Aplica a toda el área.' });
  });
});
