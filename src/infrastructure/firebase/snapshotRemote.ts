import { collection, doc, getDoc, getDocs, type Firestore } from 'firebase/firestore';
import { SNAPSHOT_FORMAT_VERSION, type SessionSnapshot } from '@/domain/ports';
import type { AuditEvent, ClarificationRequest, IceEvaluation, Initiative, Participant, RankingEntry, RefinementBallot, Session } from '@/domain/types';

export async function loadSessionSnapshotRemote(
  firestore: Firestore,
  sessionId: string,
): Promise<SessionSnapshot> {
  const names = ['participants', 'initiatives', 'clarifications', 'ballots', 'iceRatings', 'audit', 'private', 'authorship', 'originals'] as const;
  const [sessionDoc, ...collections] = await Promise.all([
    getDoc(doc(firestore, 'sessions', sessionId)),
    ...names.map((name) => getDocs(collection(firestore, 'sessions', sessionId, name))),
  ]);
  if (!sessionDoc.exists()) throw new Error('No se encontró la sesión para exportar.');
  const byName = Object.fromEntries(names.map((name, index) => [name, collections[index]!])) as Record<(typeof names)[number], (typeof collections)[number]>;
  const raw = sessionDoc.data();
  const privateNames = new Map(byName.private.docs.map((item) => [item.id, String(item.data().realName ?? '')]));
  const participantIdByUid = new Map(byName.participants.docs.flatMap((item) =>
    typeof item.data().activeUid === 'string' ? [[item.data().activeUid as string, item.id] as const] : [],
  ));
  const authorship = new Map(byName.authorship.docs.map((item) => [item.id, item.data()]));
  const originalsByInitiative = new Map<string, Initiative['originals'][number][]>();
  byName.originals.docs.forEach((item) => {
    const data = item.data(); const initiativeId = String(data.initiativeId ?? '');
    const current = originalsByInitiative.get(initiativeId) ?? [];
    current.push({ id: item.id, text: String(data.text ?? ''), authorId: String(data.authorId ?? ''), fusedAt: String(data.fusedAt ?? '') });
    originalsByInitiative.set(initiativeId, current);
  });
  const participants: Participant[] = byName.participants.docs.map((item) => ({
    id: item.id, alias: String(item.data().alias ?? ''), realName: privateNames.get(item.id) ?? '',
    accessTokenId: `historical-${item.id}`, connected: item.data().connected === true,
    progress: item.data().progress as Participant['progress'],
  }));
  const initiatives: Initiative[] = byName.initiatives.docs.map((item) => {
    const data = item.data(); const author = authorship.get(item.id);
    const ids = Array.isArray(author?.authorParticipantIds)
      ? author.authorParticipantIds.map(String)
      : typeof author?.authorParticipantId === 'string'
        ? [author.authorParticipantId]
        : typeof author?.authorUid === 'string' && participantIdByUid.has(author.authorUid)
          ? [participantIdByUid.get(author.authorUid)!] : [];
    return { id: item.id, text: String(data.text ?? ''), authorIds: ids,
      originals: originalsByInitiative.get(item.id) ?? [], status: data.status === 'FUSED' ? 'FUSED' : 'ACTIVE',
      mergedIntoId: typeof data.mergedIntoId === 'string' ? data.mergedIntoId : null, revision: Number(data.revision ?? 1) };
  });
  const session: Session = {
    id: sessionId, version: Number(raw.version ?? 1), stage: raw.stage as Session['stage'],
    x0: String(raw.x0 ?? ''), xf: String(raw.xf ?? ''), expectedParticipants: Number(raw.expectedParticipants ?? participants.length),
    initiativesPerParticipant: Number(raw.initiativesPerParticipant ?? 1), finalistCount: typeof raw.finalistCount === 'number' ? raw.finalistCount : null,
    finalistIds: Array.isArray(raw.finalistIds) ? raw.finalistIds.map(String) : [],
    tieBreak: raw.tieBreak == null ? null : { candidateIds: Array.isArray(raw.tieBreak.candidateIds) ? raw.tieBreak.candidateIds.map(String) : [], slotsRemaining: Number(raw.tieBreak.slotsRemaining ?? 0) },
    iceConfig: raw.iceConfig == null ? null : raw.iceConfig as Session['iceConfig'], paused: raw.paused === true,
    createdAt: String(raw.createdAt ?? ''), updatedAt: String(raw.updatedAt ?? ''),
    ...(typeof raw.finalizedAt === 'string' ? { finalizedAt: raw.finalizedAt } : {}),
    ...(typeof raw.expiresAt === 'string' ? { expiresAt: raw.expiresAt } : {}),
  };
  const resultsDoc = await getDoc(doc(firestore, 'sessions', sessionId, 'results', 'ranking'));
  return {
    localId: `remote-${sessionId}`, sessionId, revision: session.version,
    savedAt: new Date().toISOString(), formatVersion: SNAPSHOT_FORMAT_VERSION,
    state: {
      session, participants, initiatives,
      clarifications: byName.clarifications.docs.map((item) => ({ id: item.id, ...item.data() }) as ClarificationRequest),
      ballots: byName.ballots.docs.map((item) => ({ id: item.id, ...item.data() }) as RefinementBallot),
      iceEvaluations: byName.iceRatings.docs.map((item) => ({ id: item.id, ...item.data() }) as IceEvaluation),
      ranking: (resultsDoc.data()?.entries ?? []) as RankingEntry[],
      audit: byName.audit.docs.map((item) => ({ id: item.id, ...item.data() }) as AuditEvent),
    },
  };
}
