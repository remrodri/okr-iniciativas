import { DomainError } from './errors';
import { validateFinalistCount } from './refinementPlan';
import type { AuditEvent, RefinementBallot } from './types';

export interface RefinementTie {
  readonly candidateIds: readonly string[];
  readonly slotsRemaining: number;
}

export interface ResolveRefinementInput {
  readonly initiativeIds: readonly string[];
  readonly ballots: readonly RefinementBallot[];
  readonly finalistCount: number;
}

export interface VoteCount {
  readonly initiativeId: string;
  readonly votes: number;
}

export interface RefinementResolution {
  readonly finalists: readonly string[];
  readonly voteCounts: readonly VoteCount[];
  readonly tie: RefinementTie | null;
}

function countVotes(
  initiativeIds: readonly string[],
  ballots: readonly RefinementBallot[],
): VoteCount[] {
  const counts = new Map(initiativeIds.map((id) => [id, 0]));

  for (const ballot of ballots) {
    if (ballot.round !== 'REFINEMENT') {
      continue;
    }
    for (const id of ballot.selection) {
      if (counts.has(id)) {
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
  }

  const order = new Map(initiativeIds.map((id, index) => [id, index]));
  return [...counts.entries()]
    .map(([initiativeId, votes]) => ({ initiativeId, votes }))
    .sort(
      (left, right) =>
        right.votes - left.votes ||
        (order.get(left.initiativeId) ?? 0) -
          (order.get(right.initiativeId) ?? 0),
    );
}

export function resolveRefinement(
  input: ResolveRefinementInput,
): RefinementResolution {
  const finalistCount = validateFinalistCount(
    input.finalistCount,
    input.initiativeIds.length,
  );
  const voteCounts = countVotes(input.initiativeIds, input.ballots);

  if (finalistCount === input.initiativeIds.length) {
    return {
      finalists: [...input.initiativeIds],
      voteCounts,
      tie: null,
    };
  }

  const boundaryVotes = voteCounts[finalistCount - 1]?.votes;
  if (boundaryVotes === undefined) {
    return { finalists: [], voteCounts, tie: null };
  }

  const above = voteCounts.filter((entry) => entry.votes > boundaryVotes);
  const tied = voteCounts.filter((entry) => entry.votes === boundaryVotes);

  if (tied.length === 1) {
    return {
      finalists: voteCounts
        .slice(0, finalistCount)
        .map((entry) => entry.initiativeId),
      voteCounts,
      tie: null,
    };
  }

  return {
    finalists: above.map((entry) => entry.initiativeId),
    voteCounts,
    tie: {
      candidateIds: tied.map((entry) => entry.initiativeId),
      slotsRemaining: finalistCount - above.length,
    },
  };
}

export interface DecideTieInput {
  readonly tie: RefinementTie;
  readonly selectedIds: readonly string[];
  readonly actorId: string;
  readonly auditId: string;
  readonly now: string;
}

export interface DecideTieResult {
  readonly selected: readonly string[];
  readonly audit: AuditEvent;
}

export function decideTie(input: DecideTieInput): DecideTieResult {
  const candidates = new Set(input.tie.candidateIds);
  const unique = new Set(input.selectedIds);

  if (
    input.tie.slotsRemaining < 1 ||
    input.selectedIds.length !== input.tie.slotsRemaining ||
    unique.size !== input.selectedIds.length ||
    input.selectedIds.some((id) => !candidates.has(id))
  ) {
    throw new DomainError(
      'INVALID_TIE_DECISION',
      `La decisión debe elegir exactamente ${input.tie.slotsRemaining} iniciativas empatadas distintas.`,
      'selectedIds',
    );
  }

  return {
    selected: [...input.selectedIds],
    audit: {
      id: input.auditId,
      actorId: input.actorId,
      actorRole: 'FACILITATOR',
      action: 'TIE_DECISION',
      fromStage: 'DESEMPATE_DEPURACION',
      toStage: 'CONFIGURACION_ICE',
      at: input.now,
      details: { selectedIds: input.selectedIds.join(',') },
    },
  };
}
