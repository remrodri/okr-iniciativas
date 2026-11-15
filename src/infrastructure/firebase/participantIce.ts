import { doc, getDoc, writeBatch, type Firestore } from 'firebase/firestore';

import { createIceEvaluation } from '@/domain/iceEvaluation';
import type { IceScores } from '@/domain/types';

export interface SubmitIceEvaluationInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly participantId: string;
  readonly ratings: Readonly<Record<string, IceScores>>;
  readonly submissionId: string;
  readonly now: string;
}

export async function submitIceEvaluationRemote(
  input: SubmitIceEvaluationInput,
): Promise<void> {
  const sessionSnapshot = await getDoc(
    doc(input.firestore, 'sessions', input.sessionId),
  );
  const finalistIds = Array.isArray(sessionSnapshot.data()?.finalistIds)
    ? sessionSnapshot.data()!.finalistIds.map((item: unknown) => String(item))
    : [];
  const evaluation = createIceEvaluation({
    id: input.participantId,
    participantId: input.participantId,
    finalistIds,
    ratings: input.ratings,
    submissionId: input.submissionId,
    now: input.now,
  });

  const batch = writeBatch(input.firestore);
  batch.set(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'iceRatings',
      input.participantId,
    ),
    evaluation,
  );
  batch.update(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'participants',
      input.participantId,
    ),
    { 'progress.iceSubmitted': true },
  );
  await batch.commit();
}
