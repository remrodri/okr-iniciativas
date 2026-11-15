import { doc, getDoc, type Firestore } from 'firebase/firestore';

import { DomainError } from '@/domain/errors';
import { claimParticipantAccess, type ParticipantIdentity } from './accessClaim';
import { hashToken } from './hashToken';

export interface EnterParticipantInput {
  readonly firestore: Firestore;
  readonly publicCode: string;
  readonly token: string;
  readonly realName: string;
  readonly uid: string;
  readonly now: string;
}

export interface EnteredParticipant extends ParticipantIdentity {
  readonly accessTokenId: string;
}

export function normalizePublicCode(value: string): string {
  return value.trim().toUpperCase().replaceAll('-', '').replaceAll(' ', '');
}

export function validatePrivateName(value: string): string {
  const name = value.trim();
  if (name.length === 0) {
    throw new DomainError(
      'INVALID_LIMIT',
      'Escribe tu nombre real para ingresar.',
      'realName',
    );
  }
  return name;
}

export async function enterParticipantSession(
  input: EnterParticipantInput,
): Promise<EnteredParticipant> {
  const publicCode = normalizePublicCode(input.publicCode);
  const codeSnapshot = await getDoc(
    doc(input.firestore, 'sessionCodes', publicCode),
  );
  const sessionId = codeSnapshot.data()?.sessionId;
  if (!codeSnapshot.exists() || typeof sessionId !== 'string') {
    throw new DomainError(
      'INVALID_LIMIT',
      'El código de sesión no es válido.',
      'publicCode',
    );
  }

  const realName = validatePrivateName(input.realName);
  const identity = await claimParticipantAccess({
    firestore: input.firestore,
    token: input.token.trim(),
    uid: input.uid,
    now: input.now,
    expectedSessionId: sessionId,
    realName,
  });

  return {
    ...identity,
    accessTokenId: await hashToken(input.token.trim()),
  };
}
