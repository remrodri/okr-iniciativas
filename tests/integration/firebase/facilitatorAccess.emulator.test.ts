import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

import { claimParticipantAccess } from '@/infrastructure/firebase/accessClaim';
import { claimFacilitatorAccess } from '@/infrastructure/firebase/facilitatorAccess';
import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import { provisionSession } from '@/infrastructure/firebase/sessionProvisioning';

const timestamp = Date.now();
const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `facilitator-${timestamp}`,
});

afterAll(async () => {
  await client.dispose();
});

const now = '2026-11-14T10:00:00.000Z';

describe('recuperación del facilitador', () => {
  it('recupera el panel con la clave privada y rechaza al participante', async () => {
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
      now,
    });

    const panel = await claimFacilitatorAccess({
      firestore: client.firestore,
      token: provisioned.facilitatorToken,
      uid: credential.user.uid,
      now,
    });

    expect(panel.sessionId).toBe(provisioned.sessionId);
    const sessionSnapshot = await getDoc(
      doc(client.firestore, 'sessions', panel.sessionId),
    );
    expect(sessionSnapshot.data()?.stage).toBe('CONFIGURACION');

    const participant = provisioned.participants[1];
    if (participant === undefined) {
      throw new Error('Falta participante.');
    }

    await expect(
      claimFacilitatorAccess({
        firestore: client.firestore,
        token: participant.token,
        uid: credential.user.uid,
        now,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_LIMIT' });

    await expect(
      claimParticipantAccess({
        firestore: client.firestore,
        token: provisioned.publicCode,
        uid: credential.user.uid,
        now,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_LIMIT' });
  });

  it('revoca al facilitador anterior al recuperar desde otro dispositivo', async () => {
    const credentialA = await client.signInAnonymously();
    const provisioned = await provisionSession({
      firestore: client.firestore,
      creatorUid: credentialA.user.uid,
      config: {
        x0: 'X0',
        xf: 'Xf',
        expectedParticipants: 2,
        initiativesPerParticipant: 1,
      },
      now,
    });
    await claimFacilitatorAccess({
      firestore: client.firestore,
      token: provisioned.facilitatorToken,
      uid: credentialA.user.uid,
      now,
    });

    const clientB = createFirebaseClient({
      apiKey: 'demo-key',
      authDomain: 'demo-okr.firebaseapp.com',
      projectId: 'demo-okr',
      appId: 'demo-app',
      useEmulators: true,
      emulatorHost: '127.0.0.1',
      appName: `facilitator-b-${timestamp}`,
    });
    try {
      const credentialB = await clientB.signInAnonymously();
      await claimFacilitatorAccess({
        firestore: clientB.firestore,
        token: provisioned.facilitatorToken,
        uid: credentialB.user.uid,
        now,
      });

      await expect(
        updateDoc(doc(client.firestore, 'sessions', provisioned.sessionId), {
          stage: 'SALA_DE_ESPERA',
        }),
      ).rejects.toMatchObject({ code: 'permission-denied' });
      await expect(
        updateDoc(doc(clientB.firestore, 'sessions', provisioned.sessionId), {
          stage: 'SALA_DE_ESPERA',
        }),
      ).resolves.toBeUndefined();
    } finally {
      await clientB.dispose();
    }
  });

});
