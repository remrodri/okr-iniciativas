import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { submitIceEvaluationRemote } from '@/infrastructure/firebase/participantIce';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const sessionId = `ice-evaluation-${Date.now()}`;
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
      stage: 'EVALUACION_ICE',
      creatorUid: 'facilitator',
      finalistIds: ['i1', 'i2'],
    });
    await setDoc(doc(db, 'access', 'participant-access-ice'), {
      sessionId,
      role: 'PARTICIPANT',
      participantId,
      activeUid: participantUid,
    });
    await setDoc(
      doc(db, 'sessions', sessionId, 'accessMap', participantId),
      { accessId: 'participant-access-ice' },
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
  });
});

afterAll(async () => testEnv.cleanup());

describe('envío completo de ICE', () => {
  it('guarda todas las finalistas y confirma el progreso de forma idempotente', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    const input = {
      firestore: db,
      sessionId,
      participantId,
      ratings: {
        i1: { impact: 8, confidence: 7, ease: 6 },
        i2: { impact: 5, confidence: 9, ease: 4 },
      },
      submissionId: 'stable-ice-submission',
      now: '2026-11-15T00:30:00.000Z',
    };

    await submitIceEvaluationRemote(input);
    await submitIceEvaluationRemote(input);

    const evaluation = await getDoc(
      doc(db, 'sessions', sessionId, 'iceRatings', participantId),
    );
    expect(evaluation.data()?.ratings).toEqual(input.ratings);
    const participant = await getDoc(
      doc(db, 'sessions', sessionId, 'participants', participantId),
    );
    expect(participant.data()?.progress.iceSubmitted).toBe(true);
  });

  it('rechaza finalistas faltantes y notas fuera de 1..10', async () => {
    const db = testEnv.authenticatedContext(participantUid).firestore();
    await expect(
      submitIceEvaluationRemote({
        firestore: db,
        sessionId,
        participantId,
        ratings: { i1: { impact: 8, confidence: 7, ease: 6 } },
        submissionId: 'missing-rating',
        now: '2026-11-15T00:31:00.000Z',
      }),
    ).rejects.toThrow('Debes evaluar todas las iniciativas finalistas');
    await expect(
      submitIceEvaluationRemote({
        firestore: db,
        sessionId,
        participantId,
        ratings: {
          i1: { impact: 11, confidence: 7, ease: 6 },
          i2: { impact: 5, confidence: 9, ease: 4 },
        },
        submissionId: 'invalid-score',
        now: '2026-11-15T00:32:00.000Z',
      }),
    ).rejects.toThrow('entero entre 1 y 10');
  });
});
