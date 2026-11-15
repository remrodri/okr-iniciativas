import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import {
  decideTie,
  resolveRefinement,
  type RefinementResolution,
  type RefinementTie,
} from '@/domain/finalists';
import type { IceConfig, RefinementBallot } from '@/domain/types';

export interface RefinementControlData {
  readonly ballots: readonly RefinementBallot[];
  readonly finalistCount: number | null;
  readonly finalistIds: readonly string[];
  readonly tieBreak: RefinementTie | null;
  readonly expectedParticipants: number;
  readonly iceConfig: IceConfig | null;
  readonly stage: string;
}

function toBallot(id: string, data: Record<string, unknown>): RefinementBallot {
  return {
    id,
    participantId: String(data.participantId ?? ''),
    round: data.round === 'TIEBREAK' ? 'TIEBREAK' : 'REFINEMENT',
    selection: Array.isArray(data.selection)
      ? data.selection.map((item) => String(item))
      : [],
    submissionId: String(data.submissionId ?? ''),
    submittedAt: String(data.submittedAt ?? ''),
  };
}

export function subscribeRefinementControl(
  firestore: Firestore,
  sessionId: string,
  onData: (data: RefinementControlData) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  let ballots: readonly RefinementBallot[] | null = null;
  let session: Omit<RefinementControlData, 'ballots'> | null = null;

  function emit() {
    if (ballots === null || session === null) {
      return;
    }
    onData({ ...session, ballots });
  }

  const unsubscribeSession = onSnapshot(
    doc(firestore, 'sessions', sessionId),
    (snapshot) => {
      const data = snapshot.data();
      if (data === undefined) {
        return;
      }
      session = {
        finalistCount:
          typeof data.finalistCount === 'number' ? data.finalistCount : null,
        finalistIds: Array.isArray(data.finalistIds)
          ? data.finalistIds.map((item: unknown) => String(item))
          : [],
        tieBreak:
          data.tieBreak === null || data.tieBreak === undefined
            ? null
            : {
                candidateIds: Array.isArray(data.tieBreak.candidateIds)
                  ? data.tieBreak.candidateIds.map((item: unknown) =>
                      String(item),
                    )
                  : [],
                slotsRemaining: Number(data.tieBreak.slotsRemaining ?? 0),
              },
        expectedParticipants: Number(data.expectedParticipants ?? 0),
        iceConfig:
          data.iceConfig === null || data.iceConfig === undefined
            ? null
            : {
                method:
                  data.iceConfig.method === 'WEIGHTED'
                    ? 'WEIGHTED'
                    : 'MULTIPLICATIVE',
                weights:
                  data.iceConfig.weights === null ||
                  data.iceConfig.weights === undefined
                    ? null
                    : {
                        impact: Number(data.iceConfig.weights.impact ?? 0),
                        confidence: Number(
                          data.iceConfig.weights.confidence ?? 0,
                        ),
                        ease: Number(data.iceConfig.weights.ease ?? 0),
                      },
              },
        stage: String(data.stage ?? ''),
      };
      emit();
    },
    onError,
  );

  const unsubscribeBallots = onSnapshot(
    collection(firestore, 'sessions', sessionId, 'ballots'),
    (snapshot) => {
      ballots = snapshot.docs.map((item) => toBallot(item.id, item.data()));
      emit();
    },
    onError,
  );

  return () => {
    unsubscribeSession();
    unsubscribeBallots();
  };
}

export interface OpenRefinementInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly finalistCount: number;
  readonly now: string;
}

export async function openRefinementRemote(
  input: OpenRefinementInput,
): Promise<void> {
  await updateDoc(doc(input.firestore, 'sessions', input.sessionId), {
    stage: 'DEPURACION',
    finalistCount: input.finalistCount,
    finalistIds: [],
    tieBreak: null,
    updatedAt: input.now,
  });
}

export interface SkipRefinementInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly initiativeIds: readonly string[];
  readonly now: string;
}

export async function skipRefinementRemote(
  input: SkipRefinementInput,
): Promise<void> {
  await updateDoc(doc(input.firestore, 'sessions', input.sessionId), {
    stage: 'CONFIGURACION_ICE',
    finalistCount: input.initiativeIds.length,
    finalistIds: [...input.initiativeIds],
    tieBreak: null,
    updatedAt: input.now,
  });
}

export interface ResolveRefinementRemoteInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly initiativeIds: readonly string[];
  readonly ballots: readonly RefinementBallot[];
  readonly finalistCount: number;
  readonly now: string;
}

export interface ResolveRefinementRemoteResult {
  readonly resolution: RefinementResolution;
  readonly nextStage: 'CONFIGURACION_ICE' | 'DESEMPATE_DEPURACION';
}

export async function resolveRefinementRemote(
  input: ResolveRefinementRemoteInput,
): Promise<ResolveRefinementRemoteResult> {
  const resolution = resolveRefinement({
    initiativeIds: input.initiativeIds,
    ballots: input.ballots,
    finalistCount: input.finalistCount,
  });
  const nextStage =
    resolution.tie === null ? 'CONFIGURACION_ICE' : 'DESEMPATE_DEPURACION';

  await updateDoc(doc(input.firestore, 'sessions', input.sessionId), {
    stage: nextStage,
    finalistIds: resolution.finalists,
    tieBreak: resolution.tie,
    updatedAt: input.now,
  });

  return { resolution, nextStage };
}

export interface DecideTieRemoteInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly tie: RefinementTie;
  readonly aboveIds: readonly string[];
  readonly selectedIds: readonly string[];
  readonly actorId: string;
  readonly auditId: string;
  readonly now: string;
}

export async function decideTieRemote(
  input: DecideTieRemoteInput,
): Promise<void> {
  const decision = decideTie({
    tie: input.tie,
    selectedIds: input.selectedIds,
    actorId: input.actorId,
    auditId: input.auditId,
    now: input.now,
  });

  const batch = writeBatch(input.firestore);
  batch.update(doc(input.firestore, 'sessions', input.sessionId), {
    stage: 'CONFIGURACION_ICE',
    finalistIds: [...input.aboveIds, ...decision.selected],
    tieBreak: null,
    updatedAt: input.now,
  });
  batch.set(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'audit',
      input.auditId,
    ),
    decision.audit,
  );
  await batch.commit();
}

export interface ContinueWithIncompleteInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly actorId: string;
  readonly auditId: string;
  readonly completeBallots: number;
  readonly expectedParticipants: number;
  readonly now: string;
}

export async function continueWithIncompleteRemote(
  input: ContinueWithIncompleteInput,
): Promise<void> {
  await setDoc(
    doc(
      input.firestore,
      'sessions',
      input.sessionId,
      'audit',
      input.auditId,
    ),
    {
      id: input.auditId,
      actorId: input.actorId,
      actorRole: 'FACILITATOR',
      action: 'CONTINUE_WITH_INCOMPLETE_BALLOTS',
      fromStage: 'DEPURACION',
      toStage: 'CONFIGURACION_ICE',
      at: input.now,
      details: {
        completeBallots: input.completeBallots,
        expectedParticipants: input.expectedParticipants,
      },
    },
  );
}
