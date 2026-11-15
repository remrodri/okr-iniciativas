import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { submitRefinementBallotRemote } from '@/infrastructure/firebase/participantBallot';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = `refinement-ballot-${Date.now()}`;
const participantId = 'participant-one';
const participantUid = 'participant-one-uid';
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
      stage: 'DEPURACION',
      finalistCount: 2,
      creatorUid: 'facilitator',
    });
    await setDoc(doc(db, 'access', 'participant-access'), {
      sessionId,
      role: 'PARTICIPANT',
      participantId,
      activeUid: participantUid,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'accessMap', participantId),
      { accessId: 'participant-access' },
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'participants', participantId),
      {
        alias: 'Faro',
        activeUid: participantUid,
        connected: true,
        progress: {
          brainstormingSubmitted: true,
          refinementSubmitted: false,
          tieBreakSubmitted: false,
          iceSubmitted: false,
        },
      },
    );
    for (const [id, text] of [
      ['i1', 'Primera'],
      ['i2', 'Segunda'],
      ['i3', 'Tercera'],
    ]) {
      await setDoc(doc(db, 'sessions', sessionId, 'initiatives', id), {
        id,
        text,
        status: 'ACTIVE',
        mergedIntoId: null,
        revision: 1,
      });
    }
  });
});

afterAll(async () => testEnv.cleanup());

describe('envío móvil de depuración', () => {
  it('confirma exactamente N y permite repetir el mismo envío', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    const input = {
      firestore: db,
      sessionId,
      participantId,
      selection: ['i1', 'i2'],
      submissionId: 'stable-submission',
      now: '2026-11-15T00:10:00.000Z',
    };

    await submitRefinementBallotRemote(input);
    await submitRefinementBallotRemote(input);

    expect(
      (
        await getDoc(
          doc(
            db,
            'sessions',
            sessionId,
            'ballots',
            `${participantId}_REFINEMENT`,
          ),
        )
      ).data()?.selection,
    ).toEqual(['i1', 'i2']);
    expect(
      (
        await getDoc(
          doc(db, 'sessions', sessionId, 'participants', participantId),
        )
      ).data()?.progress.refinementSubmitted,
    ).toBe(true);
  });

  it('rechaza N−1 y una iniciativa inexistente', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    await expect(
      submitRefinementBallotRemote({
        firestore: db,
        sessionId,
        participantId,
        selection: ['i1'],
        submissionId: 'short',
        now: '2026-11-15T00:11:00.000Z',
      }),
    ).rejects.toThrow('Debes seleccionar exactamente 2 iniciativas.');
    await expect(
      submitRefinementBallotRemote({
        firestore: db,
        sessionId,
        participantId,
        selection: ['i1', 'missing'],
        submissionId: 'unknown',
        now: '2026-11-15T00:12:00.000Z',
      }),
    ).rejects.toThrow('no están disponibles');
  });
});
