import { doc, getDoc, writeBatch, type Firestore } from 'firebase/firestore';
import { applyStageAction, type StageAction } from '@/domain/stateMachine';
import type { Session } from '@/domain/types';

export async function changeStageRemote(input: {
  firestore: Firestore; sessionId: string; action: StageAction;
  actorId: string; now: string; auditId: string;
}): Promise<void> {
  const sessionRef = doc(input.firestore, 'sessions', input.sessionId);
  const current = await getDoc(sessionRef);
  if (!current.exists()) throw new Error('No se encontró la sesión.');
  const result = applyStageAction({
    session: { id: input.sessionId, ...current.data() } as Session,
    action: input.action, actorId: input.actorId,
    actorRole: 'FACILITATOR', now: input.now, auditId: input.auditId,
  });
  const batch = writeBatch(input.firestore);
  batch.update(sessionRef, {
    stage: result.session.stage,
    version: result.session.version,
    updatedAt: result.session.updatedAt,
  });
  batch.set(doc(input.firestore, 'sessions', input.sessionId, 'audit', input.auditId), result.audit);
  await batch.commit();
}
