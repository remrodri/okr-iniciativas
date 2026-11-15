import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import { DomainError } from '@/domain/errors';
import { assertInitiativeText } from '@/domain/limits';
import type {
  ClarificationRequest,
  ParticipantProgress,
  SessionStage,
} from '@/domain/types';

function initiativeIds(participantId: string, count: number): string[] {
  return Array.from(
    { length: count },
    (_, index) => `${participantId}-${index + 1}`,
  );
}

export interface SubmitInitiativesInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly participantId: string;
  readonly texts: readonly string[];
  readonly now: string;
}

export async function submitInitiativesRemote(
  input: SubmitInitiativesInput,
): Promise<readonly string[]> {
  const sessionRef = doc(input.firestore, 'sessions', input.sessionId);
  const participantRef = doc(
    input.firestore,
    'sessions',
    input.sessionId,
    'participants',
    input.participantId,
  );
  const [sessionSnapshot, participantSnapshot] = await Promise.all([
    getDoc(sessionRef),
    getDoc(participantRef),
  ]);
  const expectedCount = Number(
    sessionSnapshot.data()?.initiativesPerParticipant ?? 0,
  );
  if (input.texts.length !== expectedCount) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      `Debes enviar exactamente ${expectedCount} iniciativas.`,
      'texts',
    );
  }
  const texts = input.texts.map(assertInitiativeText);
  if (sessionSnapshot.data()?.stage !== 'BRAINSTORMING') {
    throw new DomainError(
      'INVALID_STAGE_ACTION',
      'La recepción de iniciativas no está abierta.',
      'stage',
    );
  }
  if (!participantSnapshot.exists()) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      'No se encontró al participante.',
      'participantId',
    );
  }

  const ids = initiativeIds(input.participantId, expectedCount);
  const progress = participantSnapshot.data().progress as ParticipantProgress;
  if (progress.brainstormingSubmitted) {
    return ids;
  }

  const batch = writeBatch(input.firestore);
  ids.forEach((id, index) => {
    batch.set(
      doc(input.firestore, 'sessions', input.sessionId, 'initiatives', id),
      {
        id,
        text: texts[index],
        status: 'ACTIVE',
        mergedIntoId: null,
        revision: 1,
        createdAt: input.now,
        updatedAt: input.now,
      },
    );
    batch.set(
      doc(input.firestore, 'sessions', input.sessionId, 'authorship', id),
      { authorUid: participantSnapshot.data().activeUid, originals: [], createdAt: input.now },
    );
  });
  batch.update(participantRef, {
    'progress.brainstormingSubmitted': true,
  });
  await batch.commit();
  return ids;
}

export interface ParticipantWorkspace {
  readonly stage: SessionStage;
  readonly initiativesPerParticipant: number;
  readonly submitted: boolean;
  readonly refinementSubmitted: boolean;
  readonly tieBreakSubmitted: boolean;
  readonly iceSubmitted: boolean;
  readonly finalistCount: number | null;
  readonly finalistIds: readonly string[];
  readonly tieBreak: {
    readonly candidateIds: readonly string[];
    readonly slotsRemaining: number;
  } | null;
  readonly initiatives: readonly { readonly id: string; readonly text: string }[];
  readonly clarifications: readonly ClarificationRequest[];
}

function clarificationFrom(
  id: string,
  data: Record<string, unknown>,
): ClarificationRequest {
  return {
    id,
    initiativeId: String(data.initiativeId ?? ''),
    message: String(data.message ?? ''),
    status: data.status === 'RESOLVED' ? 'RESOLVED' : 'OPEN',
    createdAt: String(data.createdAt ?? ''),
    responseText:
      typeof data.responseText === 'string' ? data.responseText : null,
  };
}

export function subscribeParticipantWorkspace(
  firestore: Firestore,
  sessionId: string,
  participantId: string,
  onData: (data: ParticipantWorkspace) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let stage: SessionStage | null = null;
  let count: number | null = null;
  let submitted: boolean | null = null;
  let refinementSubmitted: boolean | null = null;
  let tieBreakSubmitted: boolean | null = null;
  let iceSubmitted: boolean | null = null;
  let finalistCount: number | null = null;
  let finalistIds: readonly string[] = [];
  let tieBreak: ParticipantWorkspace['tieBreak'] = null;
  let initiatives: readonly { readonly id: string; readonly text: string }[] = [];
  let clarifications: readonly ClarificationRequest[] = [];

  function emit() {
    if (
      stage === null ||
      count === null ||
      submitted === null ||
      refinementSubmitted === null ||
      tieBreakSubmitted === null ||
      iceSubmitted === null
    ) return;
    const ownIds = new Set(initiativeIds(participantId, count));
    onData({
      stage,
      initiativesPerParticipant: count,
      submitted,
      refinementSubmitted,
      tieBreakSubmitted,
      iceSubmitted,
      finalistCount,
      finalistIds,
      tieBreak,
      initiatives,
      clarifications: clarifications.filter((item) =>
        ownIds.has(item.initiativeId),
      ),
    });
  }

  const unsubscribeSession = onSnapshot(
    doc(firestore, 'sessions', sessionId),
    (snapshot) => {
      const data = snapshot.data();
      if (data === undefined) return;
      stage = data.stage as SessionStage;
      count = Number(data.initiativesPerParticipant ?? 0);
      finalistCount =
        typeof data.finalistCount === 'number' ? data.finalistCount : null;
      finalistIds = Array.isArray(data.finalistIds)
        ? data.finalistIds.map((item: unknown) => String(item))
        : [];
      tieBreak =
        data.tieBreak !== null &&
        typeof data.tieBreak === 'object' &&
        Array.isArray(data.tieBreak.candidateIds)
          ? {
              candidateIds: data.tieBreak.candidateIds.map((item: unknown) =>
                String(item),
              ),
              slotsRemaining: Number(data.tieBreak.slotsRemaining ?? 0),
            }
          : null;
      emit();
    },
    onError,
  );
  const unsubscribeParticipant = onSnapshot(
    doc(firestore, 'sessions', sessionId, 'participants', participantId),
    (snapshot) => {
      const progress = snapshot.data()?.progress as ParticipantProgress | undefined;
      submitted = progress?.brainstormingSubmitted === true;
      refinementSubmitted = progress?.refinementSubmitted === true;
      tieBreakSubmitted = progress?.tieBreakSubmitted === true;
      iceSubmitted = progress?.iceSubmitted === true;
      emit();
    },
    onError,
  );
  const unsubscribeClarifications = onSnapshot(
    collection(firestore, 'sessions', sessionId, 'clarifications'),
    (snapshot) => {
      clarifications = snapshot.docs.map((item) =>
        clarificationFrom(item.id, item.data()),
      );
      emit();
    },
    onError,
  );
  const unsubscribeInitiatives = onSnapshot(
    collection(firestore, 'sessions', sessionId, 'initiatives'),
    (snapshot) => {
      initiatives = snapshot.docs
        .filter((item) => item.data().status === 'ACTIVE')
        .map((item) => ({ id: item.id, text: String(item.data().text ?? '') }));
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeSession();
    unsubscribeParticipant();
    unsubscribeClarifications();
    unsubscribeInitiatives();
  };
}

export async function respondToClarificationRemote(input: {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly clarificationId: string;
  readonly responseText: string;
}): Promise<void> {
  await updateDoc(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'clarifications',
      input.clarificationId,
    ),
    { status: 'RESOLVED', responseText: assertInitiativeText(input.responseText) },
  );
}
