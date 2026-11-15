import { doc, updateDoc } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

import { claimParticipantAccess } from '@/infrastructure/firebase/accessClaim';
import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';
import { provisionSession } from '@/infrastructure/firebase/sessionProvisioning';
import {
  subscribeSessionPanel,
  type SessionPanelData,
} from '@/infrastructure/firebase/sessionPanel';

const timestamp = Date.now();
const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `panel-${timestamp}`,
});

afterAll(async () => {
  await client.dispose();
});

describe('panel de participantes en tiempo real', () => {
  it('refleja conexión y avance sin exponer la clave privada', async () => {
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
      now: '2026-11-14T10:00:00.000Z',
    });

    const received: SessionPanelData[] = [];
    let resolveFirst: (() => void) | null = null;
    const firstData = new Promise<void>((resolve) => {
      resolveFirst = resolve;
    });
    const unsubscribe = subscribeSessionPanel(
      client.firestore,
      provisioned.sessionId,
      (data) => {
        received.push(data);
        resolveFirst?.();
      },
    );

    await firstData;
    unsubscribe();
    const first = received[0];
    if (first === undefined) {
      throw new Error('No llegó el primer estado del panel.');
    }
    expect(first.publicCode).toBe(provisioned.publicCode);
    expect(first.participants).toHaveLength(2);
    expect(first.participants.map((item) => item.alias).sort()).toEqual(
      provisioned.participants.map((item) => item.alias).sort(),
    );
    expect(JSON.stringify(first)).not.toContain(
      provisioned.facilitatorToken,
    );

    const participantId = provisioned.participants[0]?.participantId;
    const participant = provisioned.participants[0];
    if (participantId === undefined || participant === undefined) {
      throw new Error('Falta participante.');
    }
    await claimParticipantAccess({
      firestore: client.firestore,
      token: participant.token,
      uid: credential.user.uid,
      now: '2026-11-14T10:00:00.000Z',
    });
    await updateDoc(
      doc(
        client.firestore,
        'sessions',
        provisioned.sessionId,
        'participants',
        participantId,
      ),
      {
        connected: true,
        progress: {
          brainstormingSubmitted: true,
          refinementSubmitted: false,
          tieBreakSubmitted: false,
          iceSubmitted: false,
        },
      },
    );

    const updated = await new Promise<SessionPanelData>((resolve) => {
      const stop = subscribeSessionPanel(
        client.firestore,
        provisioned.sessionId,
        (data) => {
          const participant = data.participants.find(
            (item) => item.participantId === participantId,
          );
          if (participant?.connected === true) {
            stop();
            resolve(data);
          }
        },
      );
    });
    expect(
      updated.participants.find((item) => item.participantId === participantId)
        ?.progress.brainstormingSubmitted,
    ).toBe(true);
  });
});
