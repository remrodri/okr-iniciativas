import { doc, getDoc } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import { enterParticipantSession } from '@/infrastructure/firebase/participantEntry';
import { provisionSession } from '@/infrastructure/firebase/sessionProvisioning';

const timestamp = Date.now();
const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `participant-entry-${timestamp}`,
});

afterAll(async () => client.dispose());

describe('ingreso con nombre privado', () => {
  it('resuelve el código, reclama la identidad y guarda el nombre sólo en private', async () => {
    const credential = await client.signInAnonymously();
    const provisioned = await provisionSession({
      firestore: client.firestore,
      creatorUid: credential.user.uid,
      config: {
        x0: 'Situación actual',
        xf: 'Situación deseada',
        expectedParticipants: 2,
        initiativesPerParticipant: 1,
      },
      now: '2026-11-14T10:00:00.000Z',
    });
    const participant = provisioned.participants[0];
    if (participant === undefined) throw new Error('Falta participante.');

    const identity = await enterParticipantSession({
      firestore: client.firestore,
      publicCode: provisioned.publicCode,
      token: participant.token,
      realName: 'Ana Pérez',
      uid: credential.user.uid,
      now: '2026-11-14T10:05:00.000Z',
    });

    expect(identity.sessionId).toBe(provisioned.sessionId);
    expect(identity.alias).toBe(participant.alias);
    const publicParticipant = await getDoc(
      doc(
        client.firestore,
        'sessions',
        identity.sessionId,
        'participants',
        identity.participantId,
      ),
    );
    expect(publicParticipant.data()).not.toHaveProperty('realName');
    await expect(
      getDoc(
        doc(
          client.firestore,
          'sessions',
          identity.sessionId,
          'private',
          identity.participantId,
        ),
      ),
    ).rejects.toMatchObject({ code: 'permission-denied' });
  });

  it('rechaza una clave personal perteneciente a otra sesión', async () => {
    const credential = await client.signInAnonymously();
    const first = await provisionSession({
      firestore: client.firestore,
      creatorUid: credential.user.uid,
      config: { x0: 'A', xf: 'B', expectedParticipants: 1, initiativesPerParticipant: 1 },
      now: '2026-11-14T11:00:00.000Z',
    });
    const second = await provisionSession({
      firestore: client.firestore,
      creatorUid: credential.user.uid,
      config: { x0: 'C', xf: 'D', expectedParticipants: 1, initiativesPerParticipant: 1 },
      now: '2026-11-14T11:01:00.000Z',
    });
    const participant = second.participants[0];
    if (participant === undefined) throw new Error('Falta participante.');

    await expect(
      enterParticipantSession({
        firestore: client.firestore,
        publicCode: first.publicCode,
        token: participant.token,
        realName: 'Luis',
        uid: credential.user.uid,
        now: '2026-11-14T11:05:00.000Z',
      }),
    ).rejects.toThrow('La clave personal no corresponde a esta sesión.');
  });
});
