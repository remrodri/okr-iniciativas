import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import { DomainError } from '@/domain/errors';
import { buildRanking } from '@/domain/ranking';
import { applyStageAction } from '@/domain/stateMachine';
import type {
  IceConfig,
  IceEvaluation,
  IceScores,
  RankingEntry,
  Session,
  SessionStage,
} from '@/domain/types';
import type { ResultAuthor } from '@/features/results/ResultsPanel';


export interface ResultsData {
  readonly stage: SessionStage;
  readonly expiresAt: string | null;
  readonly ranking: readonly RankingEntry[];
  readonly authors: readonly ResultAuthor[];
}

function toEvaluation(
  id: string,
  data: Record<string, unknown>,
): IceEvaluation {
  const rawRatings =
    typeof data.ratings === 'object' && data.ratings !== null
      ? (data.ratings as Record<string, Record<string, unknown>>)
      : {};
  const ratings: Record<string, IceScores> = {};
  for (const [initiativeId, scores] of Object.entries(rawRatings)) {
    ratings[initiativeId] = {
      impact: Number(scores.impact ?? 0),
      confidence: Number(scores.confidence ?? 0),
      ease: Number(scores.ease ?? 0),
    };
  }

  return {
    id,
    participantId: String(data.participantId ?? ''),
    ratings,
    submissionId: String(data.submissionId ?? ''),
    submittedAt: String(data.submittedAt ?? ''),
  };
}

function toRanking(value: unknown): readonly RankingEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item: Record<string, unknown>) => ({
    initiativeId: String(item.initiativeId ?? ''),
    impactMedian: Number(item.impactMedian ?? 0),
    confidenceMedian: Number(item.confidenceMedian ?? 0),
    easeMedian: Number(item.easeMedian ?? 0),
    score: Number(item.score ?? 0),
    position: Number(item.position ?? 0),
  }));
}

function toAuthors(value: unknown): readonly ResultAuthor[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item: Record<string, unknown>) => ({
    initiativeId: String(item.initiativeId ?? ''),
    names: Array.isArray(item.names)
      ? item.names.map((name: unknown) => String(name))
      : [],
  }));
}

export function subscribeResults(
  firestore: Firestore,
  sessionId: string,
  onData: (data: ResultsData) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let session: { stage: SessionStage; expiresAt: string | null } | null = null;
  let ranking: readonly RankingEntry[] = [];
  let authors: readonly ResultAuthor[] = [];
  let unsubscribeResults: Unsubscribe | null = null;

  function emit() {
    if (session === null) {
      return;
    }
    onData({
      stage: session.stage,
      expiresAt: session.expiresAt,
      ranking,
      authors,
    });
  }

  function stopResults() {
    if (unsubscribeResults !== null) {
      unsubscribeResults();
      unsubscribeResults = null;
    }
  }

  function watchResults() {
    if (unsubscribeResults !== null) {
      return;
    }
    unsubscribeResults = onSnapshot(
      doc(firestore, 'sessions', sessionId, 'results', 'ranking'),
      (snapshot) => {
        const data = snapshot.data();
        ranking = toRanking(data?.entries);
        authors = toAuthors(data?.authors);
        emit();
      },
      onError,
    );
  }

  const unsubscribeSession = onSnapshot(
    doc(firestore, 'sessions', sessionId),
    (snapshot) => {
      const data = snapshot.data();
      if (data === undefined) {
        return;
      }
      const stage = String(data.stage ?? '') as SessionStage;
      session = {
        stage,
        expiresAt:
          typeof data.expiresAt === 'string' ? data.expiresAt : null,
      };
      if (stage === 'RESULTADO_FINAL' || stage === 'FINALIZADA') {
        watchResults();
      } else {
        stopResults();
        ranking = [];
        authors = [];
      }
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeSession();
    stopResults();
  };
}

export interface PublishResultsInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly actorId: string;
  readonly now: string;
}

function buildAuthors(
  finalistIds: readonly string[],
  authorship: Readonly<Record<string, Record<string, unknown>>>,
  initiatives: Readonly<Record<string, Record<string, unknown>>>,
  participants: readonly Record<string, unknown>[],
  privateNames: Readonly<Record<string, string>>,
): readonly ResultAuthor[] {
  const nameByUid = new Map<string, string>();
  for (const participant of participants) {
    const uid = participant.activeUid;
    const participantId = participant.id;
    if (typeof uid === 'string' && typeof participantId === 'string') {
      nameByUid.set(
        uid,
        privateNames[participantId] ?? String(participant.alias ?? participantId),
      );
    }
  }

  function addNames(target: Set<string>, initiativeId: string) {
    const document = authorship[initiativeId];
    if (document === undefined) {
      return;
    }
    const authorUid = document.authorUid;
    if (typeof authorUid === 'string') {
      const name = nameByUid.get(authorUid);
      if (name !== undefined) {
        target.add(name);
      }
    }
    const originals = document.originals;
    if (Array.isArray(originals)) {
      for (const original of originals) {
        const authorId = original?.authorId;
        if (typeof authorId === 'string') {
          const name = privateNames[authorId];
          if (name !== undefined) {
            target.add(name);
          }
        }
      }
    }
  }

  return finalistIds.map((initiativeId) => {
    const names = new Set<string>();
    addNames(names, initiativeId);
    for (const [sourceId, initiative] of Object.entries(initiatives)) {
      if (initiative.mergedIntoId === initiativeId) {
        addNames(names, sourceId);
      }
    }
    return { initiativeId, names: [...names] };
  });
}

export async function publishResultsRemote(
  input: PublishResultsInput,
): Promise<readonly RankingEntry[]> {
  const sessionRef = doc(input.firestore, 'sessions', input.sessionId);
  const sessionSnapshot = await getDoc(sessionRef);
  if (!sessionSnapshot.exists()) {
    throw new DomainError(
      'INVALID_STAGE_ACTION',
      'La sesión no existe.',
      'sessionId',
    );
  }

  const data = sessionSnapshot.data();
  const stage = String(data.stage ?? '');
  if (stage !== 'EVALUACION_ICE' && stage !== 'RESULTADO_FINAL') {
    throw new DomainError(
      'INVALID_STAGE_ACTION',
      'El ranking solo se publica después de la evaluación ICE.',
      'stage',
    );
  }

  const finalistIds = Array.isArray(data.finalistIds)
    ? data.finalistIds.map((item: unknown) => String(item))
    : [];
  const iceConfig = data.iceConfig as IceConfig | null;
  if (finalistIds.length === 0 || iceConfig === null) {
    throw new DomainError(
      'INVALID_STAGE_ACTION',
      'La sesión no tiene finalistas o configuración ICE.',
      'finalistIds',
    );
  }

  const ratingsSnapshot = await getDocs(
    collection(input.firestore, 'sessions', input.sessionId, 'iceRatings'),
  );
  const evaluations = ratingsSnapshot.docs.map((item) =>
    toEvaluation(item.id, item.data()),
  );
  const ranking = buildRanking(finalistIds, evaluations, iceConfig);
  const resultsRef = doc(
    input.firestore,
    'sessions',
    input.sessionId,
    'results',
    'ranking',
  );

  if (stage === 'EVALUACION_ICE') {
    const session = { ...data, id: input.sessionId } as unknown as Session;
    const result = applyStageAction({
      session,
      action: 'PUBLISH_RESULTS',
      actorId: input.actorId,
      actorRole: 'FACILITATOR',
      now: input.now,
      auditId: doc(
        collection(input.firestore, 'sessions', input.sessionId, 'audit'),
      ).id,
    });
    const batch = writeBatch(input.firestore);
    batch.update(sessionRef, {
      stage: result.session.stage,
      version: result.session.version,
      updatedAt: result.session.updatedAt,
    });
    batch.set(
      doc(
        input.firestore,
        'sessions',
        input.sessionId,
        'audit',
        result.audit.id,
      ),
      result.audit,
    );
    batch.set(resultsRef, {
      entries: ranking,
      authors: [],
      publishedAt: input.now,
    });
    await batch.commit();
  } else {
    await setDoc(
      resultsRef,
      { entries: ranking, publishedAt: input.now },
      { merge: true },
    );
  }

  const [authorshipSnapshot, initiativesSnapshot, participantsSnapshot, privateSnapshot] =
    await Promise.all([
      getDocs(
        collection(input.firestore, 'sessions', input.sessionId, 'authorship'),
      ),
      getDocs(
        collection(input.firestore, 'sessions', input.sessionId, 'initiatives'),
      ),
      getDocs(
        collection(input.firestore, 'sessions', input.sessionId, 'participants'),
      ),
      getDocs(
        collection(input.firestore, 'sessions', input.sessionId, 'private'),
      ),
    ]);

  const authorship = Object.fromEntries(
    authorshipSnapshot.docs.map((item) => [item.id, item.data()]),
  );
  const initiatives = Object.fromEntries(
    initiativesSnapshot.docs.map((item) => [item.id, item.data()]),
  );
  const participants = participantsSnapshot.docs.map((item) => ({
    ...item.data(),
    id: item.id,
  }));
  const privateNames = Object.fromEntries(
    privateSnapshot.docs.map((item) => [
      item.id,
      String(item.data().realName ?? ''),
    ]),
  );
  const authors = buildAuthors(
    finalistIds,
    authorship,
    initiatives,
    participants,
    privateNames,
  );

  await setDoc(resultsRef, { authors }, { merge: true });

  return ranking;
}

