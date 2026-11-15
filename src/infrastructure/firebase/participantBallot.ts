import {
  collection,
  doc,
  getDocs,
  getDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import { createBallot } from '@/domain/ballots';

export interface SubmitRefinementBallotInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly participantId: string;
  readonly selection: readonly string[];
  readonly submissionId: string;
  readonly now: string;
}

export async function submitRefinementBallotRemote(
  input: SubmitRefinementBallotInput,
): Promise<void> {
  const [sessionSnapshot, initiativesSnapshot] = await Promise.all([
    getDoc(doc(input.firestore, 'sessions', input.sessionId)),
    getDocs(collection(input.firestore, 'sessions', input.sessionId, 'initiatives')),
  ]);
  const session = sessionSnapshot.data();
  const requiredCount = Number(session?.finalistCount ?? 0);
  const availableIds = initiativesSnapshot.docs
    .filter((item) => item.data().status === 'ACTIVE')
    .map((item) => item.id);
  const ballot = createBallot({
    id: `${input.participantId}_REFINEMENT`,
    participantId: input.participantId,
    round: 'REFINEMENT',
    selection: input.selection,
    availableIds,
    requiredCount,
    submissionId: input.submissionId,
    now: input.now,
  });

  const batch = writeBatch(input.firestore);
  batch.set(
    doc(input.firestore, 'sessions', input.sessionId, 'ballots', ballot.id),
    ballot,
  );
  batch.update(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'participants',
      input.participantId,
    ),
    { 'progress.refinementSubmitted': true },
  );
  await batch.commit();
}

export async function submitTieBreakBallotRemote(
  input: SubmitRefinementBallotInput,
): Promise<void> {
  const sessionSnapshot = await getDoc(
    doc(input.firestore, 'sessions', input.sessionId),
  );
  const tieBreak = sessionSnapshot.data()?.tieBreak as
    | { candidateIds?: unknown; slotsRemaining?: unknown }
    | undefined;
  const candidateIds = Array.isArray(tieBreak?.candidateIds)
    ? tieBreak.candidateIds.map((item) => String(item))
    : [];
  const requiredCount = Number(tieBreak?.slotsRemaining ?? 0);
  const ballot = createBallot({
    id: `${input.participantId}_TIEBREAK`,
    participantId: input.participantId,
    round: 'TIEBREAK',
    selection: input.selection,
    availableIds: candidateIds,
    requiredCount,
    submissionId: input.submissionId,
    now: input.now,
  });

  const batch = writeBatch(input.firestore);
  batch.set(
    doc(input.firestore, 'sessions', input.sessionId, 'ballots', ballot.id),
    ballot,
  );
  batch.update(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'participants',
      input.participantId,
    ),
    { 'progress.tieBreakSubmitted': true },
  );
  await batch.commit();
}
