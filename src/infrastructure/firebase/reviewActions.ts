import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import { DomainError } from '@/domain/errors';
import { assertInitiativeText } from '@/domain/limits';
import type {
  ClarificationRequest,
  Initiative,
} from '@/domain/types';

export interface ReviewData {
  readonly initiatives: readonly Initiative[];
  readonly clarifications: readonly ClarificationRequest[];
}

function toInitiative(id: string, data: Record<string, unknown>): Initiative {
  return {
    id,
    text: String(data.text ?? ''),
    authorIds: [],
    originals: [],
    status: data.status === 'FUSED' ? 'FUSED' : 'ACTIVE',
    mergedIntoId:
      typeof data.mergedIntoId === 'string' ? data.mergedIntoId : null,
    revision: Number(data.revision ?? 1),
  };
}

function toClarification(
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

export function subscribeReviewData(
  firestore: Firestore,
  sessionId: string,
  onData: (data: ReviewData) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let initiatives: readonly Initiative[] | null = null;
  let clarifications: readonly ClarificationRequest[] | null = null;

  function emit() {
    if (initiatives === null || clarifications === null) {
      return;
    }
    onData({ initiatives, clarifications });
  }

  const unsubscribeInitiatives = onSnapshot(
    collection(firestore, 'sessions', sessionId, 'initiatives'),
    (snapshot) => {
      initiatives = snapshot.docs.map((item) =>
        toInitiative(item.id, item.data()),
      );
      emit();
    },
    onError,
  );

  const unsubscribeClarifications = onSnapshot(
    collection(firestore, 'sessions', sessionId, 'clarifications'),
    (snapshot) => {
      clarifications = snapshot.docs.map((item) =>
        toClarification(item.id, item.data()),
      );
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeInitiatives();
    unsubscribeClarifications();
  };
}

export interface CorrectInitiativeInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly initiativeId: string;
  readonly text: string;
  readonly revision: number;
  readonly now: string;
}

export async function correctInitiativeRemote(
  input: CorrectInitiativeInput,
): Promise<void> {
  await updateDoc(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'initiatives',
      input.initiativeId,
    ),
    {
      text: assertInitiativeText(input.text),
      revision: input.revision + 1,
      updatedAt: input.now,
    },
  );
}

export interface RequestClarificationInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly clarificationId: string;
  readonly initiativeId: string;
  readonly message: string;
  readonly now: string;
}

export async function requestClarificationRemote(
  input: RequestClarificationInput,
): Promise<void> {
  await setDoc(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'clarifications',
      input.clarificationId,
    ),
    {
      id: input.clarificationId,
      initiativeId: input.initiativeId,
      message: assertInitiativeText(input.message),
      status: 'OPEN',
      createdAt: input.now,
    },
  );
}

export interface FuseInitiativesRemoteInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly targetId: string;
  readonly sourceIds: readonly string[];
  readonly mergedText: string;
  readonly now: string;
}

export async function fuseInitiativesRemote(
  input: FuseInitiativesRemoteInput,
): Promise<void> {
  if (input.sourceIds.length === 0) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      'La fusión requiere al menos una propuesta adicional.',
      'sources',
    );
  }

  const mergedText = assertInitiativeText(input.mergedText);
  const initiativePath = (id: string) =>
    doc(input.firestore, 'sessions', input.sessionId, 'initiatives', id);

  const snapshots = await Promise.all(
    [input.targetId, ...input.sourceIds].map(async (id) => {
      const snapshot = await getDoc(initiativePath(id));
      if (!snapshot.exists()) {
        throw new DomainError(
          'INVALID_INITIATIVE_COUNT',
          'No se encontró una iniciativa para fusionar.',
          'sources',
        );
      }
      return snapshot;
    }),
  );

  const batch = writeBatch(input.firestore);
  const [target, ...sources] = snapshots;
  if (target === undefined) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      'Falta la iniciativa principal.',
      'target',
    );
  }

  batch.update(initiativePath(input.targetId), {
    text: mergedText,
    status: 'ACTIVE',
    mergedIntoId: null,
    revision: Number(target.data().revision ?? 1) + 1,
    updatedAt: input.now,
  });

  sources.forEach((source) => {
    batch.update(initiativePath(source.id), {
      status: 'FUSED',
      mergedIntoId: input.targetId,
      revision: Number(source.data().revision ?? 1) + 1,
      updatedAt: input.now,
    });
  });

  await batch.commit();
}
