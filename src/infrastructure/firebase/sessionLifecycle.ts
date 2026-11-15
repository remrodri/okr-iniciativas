import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import { DomainError } from '@/domain/errors';
import {
  finalizeSession,
  isSessionAccessible,
  reopenSession,
} from '@/domain/lifecycle';
import type { Session } from '@/domain/types';

const PURGEABLE_SUBCOLLECTIONS = [
  'participants',
  'initiatives',
  'authorship',
  'clarifications',
  'originals',
  'ballots',
  'iceRatings',
  'results',
  'audit',
  'private',
  'accessMap',
] as const;

function sessionFromData(sessionId: string, data: Record<string, unknown>): Session {
  return { ...data, id: sessionId } as unknown as Session;
}

export async function finalizeRemoteSession(
  firestore: Firestore,
  sessionId: string,
  now: string,
): Promise<Session> {
  return runTransaction(firestore, async (transaction) => {
    const sessionRef = doc(firestore, 'sessions', sessionId);
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists()) {
      throw new DomainError(
        'SESSION_NOT_FINALIZED',
        'La sesión no existe.',
        'sessionId',
      );
    }

    const finalized = finalizeSession(
      sessionFromData(sessionId, snapshot.data()),
      now,
    );
    const expiresAtMillis = Date.parse(finalized.expiresAt ?? now);

    transaction.update(sessionRef, {
      stage: finalized.stage,
      finalizedAt: finalized.finalizedAt,
      expiresAt: finalized.expiresAt,
      expiresAtMillis,
      version: finalized.version,
      updatedAt: finalized.updatedAt,
    });

    return finalized;
  });
}

export async function reopenRemoteSession(
  firestore: Firestore,
  sessionId: string,
  now: string,
): Promise<Session> {
  return runTransaction(firestore, async (transaction) => {
    const sessionRef = doc(firestore, 'sessions', sessionId);
    const snapshot = await transaction.get(sessionRef);
    if (!snapshot.exists()) {
      throw new DomainError(
        'SESSION_NOT_FINALIZED',
        'La sesión no existe.',
        'sessionId',
      );
    }

    const reopened = reopenSession(
      sessionFromData(sessionId, snapshot.data()),
      now,
    );

    transaction.update(sessionRef, {
      stage: reopened.stage,
      finalizedAt: deleteField(),
      expiresAt: deleteField(),
      expiresAtMillis: deleteField(),
      version: reopened.version,
      updatedAt: reopened.updatedAt,
    });

    return reopened;
  });
}

async function deleteCollection(
  firestore: Firestore,
  path: string,
): Promise<void> {
  const snapshot = await getDocs(collection(firestore, path));
  const documents = snapshot.docs;
  for (let index = 0; index < documents.length; index += 400) {
    const batch = writeBatch(firestore);
    for (const document of documents.slice(index, index + 400)) {
      batch.delete(document.ref);
    }
    await batch.commit();
  }
}

export async function cleanupExpiredSession(
  firestore: Firestore,
  sessionId: string,
  now: string,
): Promise<boolean> {
  const sessionRef = doc(firestore, 'sessions', sessionId);
  const snapshot = await getDoc(sessionRef);
  if (!snapshot.exists()) {
    return false;
  }

  const data = snapshot.data();
  const session = sessionFromData(sessionId, data);
  if (session.stage !== 'FINALIZADA' || isSessionAccessible(session, now)) {
    return false;
  }

  const accessIds = new Set<string>();
  const facilitatorAccess = await getDoc(
    doc(firestore, 'sessions', sessionId, 'facilitatorAccess', 'current'),
  );
  const facilitatorAccessId = facilitatorAccess.data()?.accessId;
  if (typeof facilitatorAccessId === 'string') {
    accessIds.add(facilitatorAccessId);
  }
  const accessMap = await getDocs(
    collection(firestore, 'sessions', sessionId, 'accessMap'),
  );
  for (const entry of accessMap.docs) {
    const accessId = entry.data().accessId;
    if (typeof accessId === 'string') {
      accessIds.add(accessId);
    }
  }

  for (const subcollection of PURGEABLE_SUBCOLLECTIONS) {
    await deleteCollection(
      firestore,
      `sessions/${sessionId}/${subcollection}`,
    );
  }

  if (typeof data.publicCode === 'string') {
    await writeBatch(firestore)
      .delete(doc(firestore, 'sessionCodes', data.publicCode))
      .commit();
  }

  const facilitatorAccessPath = doc(
    firestore,
    'sessions',
    sessionId,
    'facilitatorAccess',
    'current',
  );
  for (const accessId of accessIds) {
    if (accessId === facilitatorAccessId) {
      continue;
    }
    await writeBatch(firestore)
      .delete(doc(firestore, 'access', accessId))
      .commit();
  }

  const finalBatch = writeBatch(firestore);
  if (typeof facilitatorAccessId === 'string') {
    finalBatch.delete(doc(firestore, 'access', facilitatorAccessId));
  }
  finalBatch.delete(facilitatorAccessPath);
  finalBatch.delete(sessionRef);
  await finalBatch.commit();
  return true;
}
