import type { SessionSnapshot } from '@/domain/ports';
import {
  generateAccessToken,
  generatePublicCode,
  type RandomBytesSource,
} from '@/domain/tokens';
import { hashToken } from '@/infrastructure/firebase/hashToken';

export interface ReactivateBackupOptions {
  readonly now: string;
  readonly createSessionId?: () => string;
  readonly randomBytes?: RandomBytesSource;
}

export interface ReactivatedParticipantCredential {
  readonly participantId: string;
  readonly alias: string;
  readonly token: string;
  readonly tokenId: string;
}

export interface ReactivatedBackup {
  readonly snapshot: SessionSnapshot;
  readonly publicCode: string;
  readonly facilitatorToken: string;
  readonly facilitatorTokenId: string;
  readonly participants: readonly ReactivatedParticipantCredential[];
}

export async function reactivateBackup(
  source: SessionSnapshot,
  options: ReactivateBackupOptions,
): Promise<ReactivatedBackup> {
  const sessionId = options.createSessionId?.() ?? globalThis.crypto.randomUUID();
  const publicCode = generatePublicCode(options.randomBytes);
  const facilitatorToken = generateAccessToken(options.randomBytes);
  const facilitatorTokenId = await hashToken(facilitatorToken);
  const usedTokenIds = new Set<string>([facilitatorTokenId]);
  const credentials: ReactivatedParticipantCredential[] = [];

  for (const participant of source.state.participants) {
    let token = '';
    let tokenId = '';
    for (let attempt = 0; attempt < 10; attempt += 1) {
      token = generateAccessToken(options.randomBytes);
      tokenId = await hashToken(token);
      if (
        !usedTokenIds.has(tokenId) &&
        tokenId !== participant.accessTokenId
      ) {
        break;
      }
    }
    if (usedTokenIds.has(tokenId) || tokenId === participant.accessTokenId) {
      throw new Error('No se pudieron generar credenciales nuevas y únicas.');
    }
    usedTokenIds.add(tokenId);
    credentials.push({
      participantId: participant.id,
      alias: participant.alias,
      token,
      tokenId,
    });
  }

  const accessByParticipant = new Map(
    credentials.map((credential) => [credential.participantId, credential.tokenId]),
  );
  const { finalizedAt: _finalizedAt, expiresAt: _expiresAt, creatorUid: _creatorUid, ...session } =
    source.state.session;
  const snapshot: SessionSnapshot = {
    localId: `reactivated-${sessionId}`,
    sessionId,
    revision: 1,
    savedAt: options.now,
    formatVersion: source.formatVersion,
    state: {
      ...structuredClone(source.state),
      session: {
        ...session,
        id: sessionId,
        version: 1,
        createdAt: options.now,
        updatedAt: options.now,
      },
      participants: source.state.participants.map((participant) => ({
        ...structuredClone(participant),
        accessTokenId: accessByParticipant.get(participant.id)!,
        connected: false,
      })),
    },
  };

  return {
    snapshot,
    publicCode,
    facilitatorToken,
    facilitatorTokenId,
    participants: credentials,
  };
}
