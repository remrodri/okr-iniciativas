import { doc, runTransaction, type Firestore } from 'firebase/firestore';

import { DomainError } from '@/domain/errors';
import { hashToken } from './hashToken';

export interface ClaimFacilitatorInput {
  readonly firestore: Firestore;
  readonly token: string;
  readonly uid: string;
  readonly now: string;
}

export interface FacilitatorPanelIdentity {
  readonly sessionId: string;
  readonly uid: string;
}

export async function claimFacilitatorAccess(
  input: ClaimFacilitatorInput,
): Promise<FacilitatorPanelIdentity> {
  const tokenId = await hashToken(input.token);
  const accessRef = doc(input.firestore, 'access', tokenId);

  const snapshot = await runTransaction(input.firestore, async (transaction) => {
    const access = await transaction.get(accessRef);
    if (!access.exists()) {
      throw new DomainError(
        'INVALID_LIMIT',
        'La clave privada no es válida.',
        'token',
      );
    }

    const data = access.data();
    if (data.role !== 'FACILITATOR' || typeof data.sessionId !== 'string') {
      throw new DomainError(
        'INVALID_LIMIT',
        'Esta clave no concede permisos de facilitador.',
        'token',
      );
    }

    transaction.update(accessRef, {
      activeUid: input.uid,
      claimedAt: input.now,
    });

    return { sessionId: data.sessionId, uid: input.uid };
  });

  return snapshot;
}
