import {
  doc,
  getDoc,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';

import { DomainError } from '@/domain/errors';
import type { ParticipantProgress } from '@/domain/types';
import { hashToken } from './hashToken';

export interface ClaimAccessInput {
  readonly firestore: Firestore;
  readonly token: string;
  readonly uid: string;
  readonly now: string;
  readonly expectedSessionId?: string;
  readonly realName?: string;
}

export interface ParticipantIdentity {
  readonly sessionId: string;
  readonly participantId: string;
  readonly alias: string;
  readonly progress: ParticipantProgress;
  readonly uid: string;
}

interface AccessDocument {
  readonly sessionId?: unknown;
  readonly role?: unknown;
  readonly participantId?: unknown;
  readonly activeUid?: unknown;
}

export async function claimParticipantAccess(
  input: ClaimAccessInput,
): Promise<ParticipantIdentity> {
  const tokenId = await hashToken(input.token);
  const accessRef = doc(input.firestore, 'access', tokenId);

  try {
    return await runTransaction(input.firestore, async (transaction) => {
      const accessSnapshot = await transaction.get(accessRef);
      if (!accessSnapshot.exists()) {
        throw new DomainError(
          'INVALID_LIMIT',
          'El código de acceso no es válido.',
          'token',
        );
      }

      const access = accessSnapshot.data() as AccessDocument;
      if (
        access.role !== 'PARTICIPANT' ||
        typeof access.sessionId !== 'string' ||
        typeof access.participantId !== 'string'
      ) {
        throw new DomainError(
          'INVALID_LIMIT',
          'El código no corresponde a un participante.',
          'token',
        );
      }

      if (
        input.expectedSessionId !== undefined &&
        access.sessionId !== input.expectedSessionId
      ) {
        throw new DomainError(
          'INVALID_LIMIT',
          'La clave personal no corresponde a esta sesión.',
          'token',
        );
      }

      if (input.uid.trim().length === 0) {
        throw new DomainError(
          'INVALID_LIMIT',
          'Debes tener una sesión anónima activa para ingresar.',
          'auth',
        );
      }

      const participantRef = doc(
        input.firestore,
        'sessions',
        access.sessionId,
        'participants',
        access.participantId,
      );
      const participantSnapshot = await transaction.get(participantRef);
      if (!participantSnapshot.exists()) {
        throw new DomainError(
          'INVALID_LIMIT',
          'El participante ya no existe en la sesión.',
          'participantId',
        );
      }

      transaction.update(accessRef, {
        activeUid: input.uid,
        claimedAt: input.now,
      });
      transaction.update(participantRef, {
        activeUid: input.uid,
        connected: true,
      });
      if (input.realName !== undefined) {
        transaction.set(
          doc(
            input.firestore,
            'sessions',
            access.sessionId,
            'private',
            access.participantId,
          ),
          { realName: input.realName, updatedAt: input.now },
          { merge: true },
        );
      }

      const participant = participantSnapshot.data();
      const progress = participant.progress as ParticipantProgress;
      if (typeof participant.alias !== 'string') {
        throw new DomainError(
          'INVALID_LIMIT',
          'El participante no tiene alias asignado.',
          'alias',
        );
      }

      return {
        sessionId: access.sessionId,
        participantId: access.participantId,
        alias: participant.alias,
        progress,
        uid: input.uid,
      };
    });
  } catch (error) {
    if (error instanceof DomainError) {
      throw error;
    }
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : '';
    if (code === 'permission-denied') {
      throw new DomainError(
        'INVALID_LIMIT',
        'No tienes permiso para reclamar este acceso.',
        'token',
      );
    }
    throw error;
  }
}

export async function resolveAccessRole(input: ClaimAccessInput): Promise<{
  readonly sessionId: string;
  readonly role: 'FACILITATOR' | 'PARTICIPANT' | 'NONE';
}> {
  const tokenId = await hashToken(input.token);
  const snapshot = await getDoc(doc(input.firestore, 'access', tokenId));
  if (!snapshot.exists()) {
    return { sessionId: '', role: 'NONE' };
  }
  const data = snapshot.data() as AccessDocument;
  const role =
    data.role === 'FACILITATOR' || data.role === 'PARTICIPANT'
      ? data.role
      : 'NONE';
  return {
    sessionId: typeof data.sessionId === 'string' ? data.sessionId : '',
    role,
  };
}
