import {
  collection,
  doc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

import { assignUniqueAliases } from '@/domain/aliases';
import { validateSessionConfig, type SessionConfigInput } from '@/domain/sessionConfig';
import {
  generateAccessToken,
  generatePublicCode,
  type RandomBytesSource,
} from '@/domain/tokens';
import { hashToken } from './hashToken';

export interface ProvisionSessionInput {
  readonly firestore: Firestore;
  readonly creatorUid: string;
  readonly config: SessionConfigInput;
  readonly now: string;
  readonly randomBytes?: RandomBytesSource;
}

export interface ProvisionedParticipant {
  readonly participantId: string;
  readonly alias: string;
  readonly token: string;
  readonly tokenId: string;
}

export interface ProvisionedSession {
  readonly sessionId: string;
  readonly publicCode: string;
  readonly facilitatorToken: string;
  readonly facilitatorTokenId: string;
  readonly participants: readonly ProvisionedParticipant[];
}

export async function provisionSession(
  input: ProvisionSessionInput,
): Promise<ProvisionedSession> {
  const config = validateSessionConfig(input.config);
  const { firestore, now } = input;

  const sessionId = doc(collection(firestore, 'sessions')).id;
  const publicCode = generatePublicCode(input.randomBytes);
  const aliases = assignUniqueAliases(config.expectedParticipants);

  const facilitatorToken = generateAccessToken(input.randomBytes);
  const facilitatorTokenId = await hashToken(facilitatorToken);

  const participants: ProvisionedParticipant[] = [];
  for (const alias of aliases) {
    const participantId = doc(
      collection(firestore, 'sessions', sessionId, 'participants'),
    ).id;
    const token = generateAccessToken(input.randomBytes);
    participants.push({
      participantId,
      alias,
      token,
      tokenId: await hashToken(token),
    });
  }

  const batch = writeBatch(firestore);

  batch.set(doc(firestore, 'sessions', sessionId), {
    publicCode,
    creatorUid: input.creatorUid,
    x0: config.x0,
    xf: config.xf,
    stage: 'CONFIGURACION',
    expectedParticipants: config.expectedParticipants,
    initiativesPerParticipant: config.initiativesPerParticipant,
    totalInitiatives: config.totalInitiatives,
    finalistCount: null,
    iceConfig: null,
    paused: false,
    version: 1,
    createdAt: now,
    updatedAt: now,
  });

  batch.set(doc(firestore, 'sessionCodes', publicCode), {
    sessionId,
    createdAt: now,
  });

  batch.set(doc(firestore, 'access', facilitatorTokenId), {
    sessionId,
    role: 'FACILITATOR',
    participantId: null,
    activeUid: null,
    createdAt: now,
  });

  batch.set(
    doc(
      firestore,
      'sessions',
      sessionId,
      'facilitatorAccess',
      'current',
    ),
    { accessId: facilitatorTokenId },
  );

  for (const participant of participants) {
    batch.set(
      doc(
        firestore,
        'sessions',
        sessionId,
        'participants',
        participant.participantId,
      ),
      {
        alias: participant.alias,
        connected: false,
        activeUid: null,
        progress: {
          brainstormingSubmitted: false,
          refinementSubmitted: false,
          tieBreakSubmitted: false,
          iceSubmitted: false,
        },
      },
    );

    batch.set(doc(firestore, 'access', participant.tokenId), {
      sessionId,
      role: 'PARTICIPANT',
      participantId: participant.participantId,
      activeUid: null,
      createdAt: now,
    });

    batch.set(
      doc(
        firestore,
        'sessions',
        sessionId,
        'accessMap',
        participant.participantId,
      ),
      { accessId: participant.tokenId },
    );
  }

  batch.set(doc(firestore, 'sessions', sessionId, 'audit', 'session-created'), {
    actorId: 'system',
    actorRole: 'SYSTEM',
    action: 'SESSION_CREATED',
    fromStage: null,
    toStage: 'CONFIGURACION',
    at: now,
    details: {
      participants: config.expectedParticipants,
      totalInitiatives: config.totalInitiatives,
    },
  });

  await batch.commit();

  return {
    sessionId,
    publicCode,
    facilitatorToken,
    facilitatorTokenId,
    participants,
  };
}
