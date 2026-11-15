import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { submitTieBreakBallotRemote } from '@/infrastructure/firebase/participantBallot';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = `tie-break-ballot-${Date.now()}`;
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
      stage: 'DESEMPATE_DEPURACION',
      creatorUid: 'facilitator',
      tieBreak: {
        candidateIds: ['i1', 'i2', 'i3', 'i4'],
        slotsRemaining: 2,
      },
    });
    await setDoc(doc(db, 'access', 'participant-access-tie'), {
      sessionId,
      role: 'PARTICIPANT',
      participantId,
      activeUid: participantUid,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'accessMap', participantId),
      { accessId: 'participant-access-tie' },
    );
    await setDoc(
      doc(db, 'sessions', sessionId, 'participants', participantId),
      {
        alias: 'Faro',
        activeUid: participantUid,
        connected: true,
        progress: {
          brainstormingSubmitted: true,
          refinementSubmitted: true,
          tieBreakSubmitted: false,
          iceSubmitted: false,
        },
      },
    );
    for (const id of ['i1', 'i2', 'i3', 'i4']) {
      await setDoc(doc(db, 'sessions', sessionId, 'initiatives', id), {
        id,
        text: `Iniciativa ${id}`,
        status: 'ACTIVE',
        mergedIntoId: null,
        revision: 1,
      });
    }
  });
});

afterAll(async () => testEnv.cleanup());

describe('envío del desempate', () => {
  it('acepta sólo los puestos restantes entre las candidatas empatadas', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    await submitTieBreakBallotRemote({
      firestore: db,
      sessionId,
      participantId,
      selection: ['i1', 'i3'],
      submissionId: 'stable-tie-submission',
      now: '2026-11-15T00:20:00.000Z',
    });

    const ballot = await getDoc(
      doc(
        db,
        'sessions',
        sessionId,
        'ballots',
        `${participantId}_TIEBREAK`,
      ),
    );
    expect(ballot.data()?.selection).toEqual(['i1', 'i3']);
    const participant = await getDoc(
      doc(db, 'sessions', sessionId, 'participants', participantId),
    );
    expect(participant.data()?.progress.tieBreakSubmitted).toBe(true);
  });

  it('rechaza candidatas fuera del empate', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    await expect(
      submitTieBreakBallotRemote({
        firestore: db,
        sessionId,
        participantId,
        selection: ['i1', 'fuera-del-empate'],
        submissionId: 'invalid-tie-submission',
        now: '2026-11-15T00:21:00.000Z',
      }),
    ).rejects.toThrow('no están disponibles');
  });
});
