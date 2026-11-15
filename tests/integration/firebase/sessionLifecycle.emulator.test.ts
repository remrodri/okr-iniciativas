import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { claimFacilitatorAccess } from '@/infrastructure/firebase/facilitatorAccess';
import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import { provisionSession } from '@/infrastructure/firebase/sessionProvisioning';
import {
  cleanupExpiredSession,
  finalizeRemoteSession,
  reopenRemoteSession,
} from '@/infrastructure/firebase/sessionLifecycle';

const rulesPath = resolve(process.cwd(), 'firebase/firestore.rules');
const timestamp = Date.now();
const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `lifecycle-${timestamp}`,
});

const t0 = '2026-11-14T10:00:00.000Z';
const oneHourLater = '2026-11-14T11:00:00.000Z';
const afterWindow = '2026-11-15T11:00:00.000Z';
const oldStart = '2026-11-10T10:00:00.000Z';
const oldAfterWindow = '2026-11-12T10:00:00.000Z';

let testEnv: RulesTestEnvironment;

async function provisionAndClaim() {
  const credential = await client.signInAnonymously();
  const provisioned = await provisionSession({
    firestore: client.firestore,
    creatorUid: credential.user.uid,
    config: {
      x0: 'X0',
      xf: 'Xf',
      expectedParticipants: 2,
      initiativesPerParticipant: 1,
    },
    now: t0,
  });
  await claimFacilitatorAccess({
    firestore: client.firestore,
    token: provisioned.facilitatorToken,
    uid: credential.user.uid,
    now: t0,
  });
  return provisioned;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-okr',
    firestore: { host: '127.0.0.1', port: 8080 },
    rules: readFileSync(rulesPath, 'utf8'),
  });
});

afterAll(async () => {
  await testEnv.cleanup();
  await client.dispose();
});

describe('expiración y limpieza diferida', () => {
  it('reabre la sesión antes del plazo', async () => {
    const provisioned = await provisionAndClaim();
    await finalizeRemoteSession(client.firestore, provisioned.sessionId, t0);

    const reopened = await reopenRemoteSession(
      client.firestore,
      provisioned.sessionId,
      oneHourLater,
    );

    expect(reopened.stage).toBe('RESULTADO_FINAL');
    const snapshot = await getDoc(
      doc(client.firestore, 'sessions', provisioned.sessionId),
    );
    expect(snapshot.data()?.expiresAt).toBeUndefined();
  });

  it('deniega la reapertura y el acceso después del plazo', async () => {
    const provisioned = await provisionAndClaim();
    await finalizeRemoteSession(client.firestore, provisioned.sessionId, t0);

    await expect(
      reopenRemoteSession(client.firestore, provisioned.sessionId, afterWindow),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });

    const expiredSessionId = `expired-${timestamp}`;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), 'sessions', expiredSessionId), {
        stage: 'FINALIZADA',
        creatorUid: 'expired-creator',
        expiresAtMillis: 1,
      });
    });
    const db = testEnv.authenticatedContext('reader-uid').firestore();
    await assertFails(getDoc(doc(db, 'sessions', expiredSessionId)));
    await assertSucceeds(
      getDoc(doc(db, 'sessions', provisioned.sessionId)),
    );
  });

  it('borra físicamente la sesión vencida al volver el facilitador', async () => {
    const provisioned = await provisionAndClaim();
    await finalizeRemoteSession(
      client.firestore,
      provisioned.sessionId,
      oldStart,
    );

    const cleaned = await cleanupExpiredSession(
      client.firestore,
      provisioned.sessionId,
      oldAfterWindow,
    );
    expect(cleaned).toBe(true);

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const session = await getDoc(
        doc(db, 'sessions', provisioned.sessionId),
      );
      expect(session.exists()).toBe(false);
      const participant = await getDoc(
        doc(
          db,
          'sessions',
          provisioned.sessionId,
          'participants',
          provisioned.participants[0]?.participantId ?? 'missing',
        ),
      );
      expect(participant.exists()).toBe(false);
      const access = await getDoc(
        doc(db, 'access', provisioned.facilitatorTokenId),
      );
      expect(access.exists()).toBe(false);
      const publicCode = await getDoc(
        doc(db, 'sessionCodes', provisioned.publicCode),
      );
      expect(publicCode.exists()).toBe(false);
    });
  });
});
