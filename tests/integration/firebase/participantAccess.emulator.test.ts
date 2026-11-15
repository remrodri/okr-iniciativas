import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

import { claimParticipantAccess } from '@/infrastructure/firebase/accessClaim';
import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import { provisionSession } from '@/infrastructure/firebase/sessionProvisioning';

const timestamp = Date.now();
const clientA = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `participant-a-${timestamp}`,
});
const clientB = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `participant-b-${timestamp}`,
});

afterAll(async () => {
  await clientA.dispose();
  await clientB.dispose();
});

const now = '2026-11-14T10:00:00.000Z';

describe('ingreso y recuperación de participante', () => {
  it('vincula el token a un uid y revoca el vínculo anterior', async () => {
    const signInA = await clientA.signInAnonymously();
    const provisioned = await provisionSession({
      firestore: clientA.firestore,
      creatorUid: signInA.user.uid,
      config: {
        x0: 'X0',
        xf: 'Xf',
        expectedParticipants: 2,
        initiativesPerParticipant: 1,
      },
      now,
    });
    const participant = provisioned.participants[0];
    if (participant === undefined) {
      throw new Error('Falta el participante de prueba.');
    }

    const identityA = await claimParticipantAccess({
      firestore: clientA.firestore,
      token: participant.token,
      uid: signInA.user.uid,
      now,
    });

    expect(identityA.sessionId).toBe(provisioned.sessionId);
    expect(identityA.participantId).toBe(participant.participantId);
    expect(identityA.alias).toBe(participant.alias);

    const participantRef = doc(
      clientA.firestore,
      'sessions',
      provisioned.sessionId,
      'participants',
      participant.participantId,
    );
    expect((await getDoc(participantRef)).data()?.activeUid).toBe(
      signInA.user.uid,
    );
    await updateDoc(participantRef, {
      connected: true,
      'progress.brainstormingSubmitted': true,
    });

    const signInB = await clientB.signInAnonymously();
    const identityB = await claimParticipantAccess({
      firestore: clientB.firestore,
      token: participant.token,
      uid: signInB.user.uid,
      now: '2026-11-14T11:00:00.000Z',
    });

    expect(identityB.participantId).toBe(identityA.participantId);
    expect(identityB.progress.brainstormingSubmitted).toBe(true);

    await expect(
      updateDoc(participantRef, { connected: false }),
    ).rejects.toMatchObject({ code: 'permission-denied' });

    const participantRefB = doc(
      clientB.firestore,
      'sessions',
      provisioned.sessionId,
      'participants',
      participant.participantId,
    );
    expect((await getDoc(participantRefB)).data()?.activeUid).toBe(
      signInB.user.uid,
    );
    await updateDoc(participantRefB, { connected: true });

    const stored = await getDoc(participantRefB);
    expect(stored.data()).toMatchObject({
      alias: participant.alias,
      connected: true,
      progress: { brainstormingSubmitted: true },
    });
    expect(signInA.user.uid).not.toBe(identityB.uid);
  });
});
