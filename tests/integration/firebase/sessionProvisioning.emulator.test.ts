import { doc, getDoc } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import { hashToken } from '@/infrastructure/firebase/hashToken';
import { provisionSession } from '@/infrastructure/firebase/sessionProvisioning';

const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `provision-${Date.now()}`,
});

afterAll(async () => {
  await client.dispose();
});

const now = '2026-11-14T10:00:00.000Z';

describe('creación de sesión y credenciales', () => {
  it('crea 40 accesos únicos sin exponer tokens en la proyección pública', async () => {
    const credential = await client.signInAnonymously();

    const provisioned = await provisionSession({
      firestore: client.firestore,
      creatorUid: credential.user.uid,
      config: {
        x0: 'Hoy no hay onboarding',
        xf: 'Cada persona se activa en un día',
        expectedParticipants: 40,
        initiativesPerParticipant: 10,
      },
      now,
    });

    expect(provisioned.participants).toHaveLength(40);
    expect(new Set(provisioned.participants.map((item) => item.token)).size).toBe(
      40,
    );
    expect(
      new Set(provisioned.participants.map((item) => item.alias)).size,
    ).toBe(40);
    expect(provisioned.participants.every((item) => item.token.length >= 32)).toBe(
      true,
    );

    const sessionSnapshot = await getDoc(
      doc(client.firestore, 'sessions', provisioned.sessionId),
    );
    expect(sessionSnapshot.exists()).toBe(true);
    expect(sessionSnapshot.data()).toMatchObject({
      stage: 'CONFIGURACION',
      expectedParticipants: 40,
      initiativesPerParticipant: 10,
      publicCode: provisioned.publicCode,
    });

    expect(sessionSnapshot.data()).not.toHaveProperty('facilitatorAccessId');

    const serialized = JSON.stringify(sessionSnapshot.data());
    for (const participant of provisioned.participants) {
      expect(serialized).not.toContain(participant.token);
      expect(serialized).not.toContain(participant.alias);
      const participantSnapshot = await getDoc(
        doc(
          client.firestore,
          'sessions',
          provisioned.sessionId,
          'participants',
          participant.participantId,
        ),
      );
      expect(participantSnapshot.data()).not.toHaveProperty('accessTokenId');
    }
    expect(serialized).not.toContain(provisioned.facilitatorToken);

    const codeSnapshot = await getDoc(
      doc(client.firestore, 'sessionCodes', provisioned.publicCode),
    );
    expect(codeSnapshot.data()).toMatchObject({
      sessionId: provisioned.sessionId,
    });

    const facilitatorAccess = await getDoc(
      doc(
        client.firestore,
        'access',
        await hashToken(provisioned.facilitatorToken),
      ),
    );
    expect(facilitatorAccess.data()).toMatchObject({
      sessionId: provisioned.sessionId,
      role: 'FACILITATOR',
      participantId: null,
    });

    const participantAccess = await getDoc(
      doc(
        client.firestore,
        'access',
        await hashToken(provisioned.participants[0]?.token ?? ''),
      ),
    );
    expect(participantAccess.data()).toMatchObject({
      sessionId: provisioned.sessionId,
      role: 'PARTICIPANT',
    });
  });
});
