import {
  collection,
  doc,
  onSnapshot,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import type { ParticipantProgress, SessionStage } from '@/domain/types';
import { isPresenceActive } from './presence';

export interface PanelParticipant {
  readonly participantId: string;
  readonly alias: string;
  readonly connected: boolean;
  readonly progress: ParticipantProgress;
}

export interface SessionPanelData {
  readonly sessionId: string;
  readonly publicCode: string;
  readonly stage: SessionStage;
  readonly participants: readonly PanelParticipant[];
}

export function subscribeSessionPanel(
  firestore: Firestore,
  sessionId: string,
  onData: (data: SessionPanelData) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let session: { publicCode: string; stage: SessionStage } | null = null;
  let participants:
    | readonly (PanelParticipant & { readonly lastSeenAtMillis: number | null })[]
    | null = null;

  function emit() {
    if (session === null || participants === null) {
      return;
    }
    onData({
      sessionId,
      publicCode: session.publicCode,
      stage: session.stage,
      participants: participants.map((participant) => ({
        ...participant,
        connected:
          participant.connected &&
          isPresenceActive(participant.lastSeenAtMillis),
      })),
    });
  }

  const unsubscribeSession = onSnapshot(
    doc(firestore, 'sessions', sessionId),
    (snapshot) => {
      const data = snapshot.data();
      if (data === undefined) {
        return;
      }
      session = {
        publicCode: String(data.publicCode ?? ''),
        stage: data.stage as SessionStage,
      };
      emit();
    },
    onError,
  );

  const unsubscribeParticipants = onSnapshot(
    collection(firestore, 'sessions', sessionId, 'participants'),
    (snapshot) => {
      participants = snapshot.docs.map((participant) => {
        const data = participant.data();
        return {
          participantId: participant.id,
          alias: String(data.alias ?? ''),
          connected: data.connected === true,
          lastSeenAtMillis:
            typeof data.lastSeenAtMillis === 'number'
              ? data.lastSeenAtMillis
              : null,
          progress: data.progress as ParticipantProgress,
        };
      });
      emit();
    },
    onError,
  );

  const presenceTimer = window.setInterval(emit, 15_000);

  return () => {
    window.clearInterval(presenceTimer);
    unsubscribeSession();
    unsubscribeParticipants();
  };
}
