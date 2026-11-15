import {
  doc,
  updateDoc,
  writeBatch,
  type Firestore,
  type WriteBatch,
} from 'firebase/firestore';

import type { SessionSnapshot } from '@/domain/ports';
import type { RandomBytesSource } from '@/domain/tokens';
import {
  reactivateBackup,
  type ReactivatedBackup,
} from '@/features/excel/reactivateBackup';

interface ReactivateBackupRemoteInput {
  readonly firestore: Firestore;
  readonly creatorUid: string;
  readonly source: SessionSnapshot;
  readonly now: string;
  readonly randomBytes?: RandomBytesSource;
  readonly createSessionId?: () => string;
}

type BatchOperation = (batch: WriteBatch) => void;

async function commitChunks(
  firestore: Firestore,
  operations: readonly BatchOperation[],
): Promise<void> {
  const size = 400;
  for (let index = 0; index < operations.length; index += size) {
    const batch = writeBatch(firestore);
    operations.slice(index, index + size).forEach((operation) => operation(batch));
    await batch.commit();
  }
}

export async function reactivateBackupRemote(
  input: ReactivateBackupRemoteInput,
): Promise<ReactivatedBackup> {
  const result = await reactivateBackup(input.source, {
    now: input.now,
    ...(input.randomBytes === undefined ? {} : { randomBytes: input.randomBytes }),
    ...(input.createSessionId === undefined
      ? {}
      : { createSessionId: input.createSessionId }),
  });
  const { firestore } = input;
  const { snapshot } = result;
  const { sessionId, state } = snapshot;
  const initial = writeBatch(firestore);

  initial.set(doc(firestore, 'sessions', sessionId), {
    ...state.session,
    creatorUid: input.creatorUid,
    publicCode: result.publicCode,
    totalInitiatives:
      state.session.expectedParticipants * state.session.initiativesPerParticipant,
    restoring: true,
  });
  initial.set(doc(firestore, 'sessionCodes', result.publicCode), {
    sessionId,
    createdAt: input.now,
  });
  initial.set(doc(firestore, 'access', result.facilitatorTokenId), {
    sessionId,
    role: 'FACILITATOR',
    participantId: null,
    activeUid: null,
    createdAt: input.now,
  });
  initial.set(
    doc(firestore, 'sessions', sessionId, 'facilitatorAccess', 'current'),
    { accessId: result.facilitatorTokenId },
  );

  result.participants.forEach((credential) => {
    const participant = state.participants.find(
      ({ id }) => id === credential.participantId,
    )!;
    initial.set(
      doc(firestore, 'sessions', sessionId, 'participants', participant.id),
      {
        alias: participant.alias,
        connected: false,
        activeUid: null,
        progress: participant.progress,
      },
    );
    initial.set(doc(firestore, 'access', credential.tokenId), {
      sessionId,
      role: 'PARTICIPANT',
      participantId: participant.id,
      activeUid: null,
      createdAt: input.now,
    });
    initial.set(
      doc(firestore, 'sessions', sessionId, 'accessMap', participant.id),
      { accessId: credential.tokenId },
    );
  });
  await initial.commit();

  const operations: BatchOperation[] = [];
  state.participants.forEach((participant) => {
    operations.push((batch) =>
      batch.set(
        doc(firestore, 'sessions', sessionId, 'private', participant.id),
        { realName: participant.realName, updatedAt: input.now },
      ),
    );
  });
  state.initiatives.forEach((initiative) => {
    operations.push((batch) =>
      batch.set(
        doc(firestore, 'sessions', sessionId, 'initiatives', initiative.id),
        {
          id: initiative.id,
          text: initiative.text,
          status: initiative.status,
          mergedIntoId: initiative.mergedIntoId,
          revision: initiative.revision,
          createdAt: state.session.createdAt,
          updatedAt: state.session.updatedAt,
        },
      ),
    );
    operations.push((batch) =>
      batch.set(
        doc(firestore, 'sessions', sessionId, 'authorship', initiative.id),
        {
          authorUid: null,
          authorParticipantId: initiative.authorIds[0] ?? null,
          authorParticipantIds: initiative.authorIds,
          originals: initiative.originals.map(({ id }) => id),
          createdAt: state.session.createdAt,
        },
      ),
    );
    initiative.originals.forEach((original) => {
      operations.push((batch) =>
        batch.set(
          doc(firestore, 'sessions', sessionId, 'originals', original.id),
          { ...original, initiativeId: initiative.id },
        ),
      );
    });
  });
  state.clarifications.forEach((clarification) => {
    operations.push((batch) =>
      batch.set(
        doc(firestore, 'sessions', sessionId, 'clarifications', clarification.id),
        clarification,
      ),
    );
  });
  state.ballots.forEach((ballot) => {
    operations.push((batch) =>
      batch.set(doc(firestore, 'sessions', sessionId, 'ballots', ballot.id), ballot),
    );
  });
  state.iceEvaluations.forEach((evaluation) => {
    operations.push((batch) =>
      batch.set(
        doc(firestore, 'sessions', sessionId, 'iceRatings', evaluation.id),
        evaluation,
      ),
    );
  });
  if (state.ranking.length > 0) {
    operations.push((batch) =>
      batch.set(doc(firestore, 'sessions', sessionId, 'results', 'ranking'), {
        entries: state.ranking,
        publishedAt: input.now,
      }),
    );
  }
  state.audit.forEach((event) => {
    operations.push((batch) =>
      batch.set(doc(firestore, 'sessions', sessionId, 'audit', event.id), event),
    );
  });
  await commitChunks(firestore, operations);
  await updateDoc(doc(firestore, 'sessions', sessionId), { restoring: false });
  return result;
}
