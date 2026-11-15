import { DomainError } from './errors';
import type { BallotRound, RefinementBallot } from './types';

export interface CreateBallotInput {
  readonly id: string;
  readonly participantId: string;
  readonly round: BallotRound;
  readonly selection: readonly string[];
  readonly availableIds: readonly string[];
  readonly requiredCount: number;
  readonly submissionId: string;
  readonly now: string;
}

function sameSelection(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function createBallot(input: CreateBallotInput): RefinementBallot {
  if (
    !Number.isInteger(input.requiredCount) ||
    input.requiredCount < 1 ||
    input.selection.length !== input.requiredCount
  ) {
    throw new DomainError(
      'INVALID_BALLOT_SIZE',
      `Debes seleccionar exactamente ${input.requiredCount} iniciativas.`,
      'selection',
    );
  }

  const unique = new Set(input.selection);
  if (unique.size !== input.selection.length) {
    throw new DomainError(
      'DUPLICATE_SELECTION',
      'No puedes votar dos veces por la misma iniciativa.',
      'selection',
    );
  }

  const available = new Set(input.availableIds);
  if (input.selection.some((id) => !available.has(id))) {
    throw new DomainError(
      'UNKNOWN_SELECTION',
      'La selección contiene iniciativas que no están disponibles.',
      'selection',
    );
  }

  if (input.submissionId.trim().length === 0) {
    throw new DomainError(
      'CONFLICTING_SUBMISSION',
      'El envío requiere un identificador estable.',
      'submissionId',
    );
  }

  return {
    id: input.id,
    participantId: input.participantId,
    round: input.round,
    selection: [...input.selection],
    submissionId: input.submissionId,
    submittedAt: input.now,
  };
}

export interface SubmitBallotResult {
  readonly ballots: readonly RefinementBallot[];
  readonly status: 'CREATED' | 'DUPLICATE';
}

export function submitBallot(
  existing: readonly RefinementBallot[],
  ballot: RefinementBallot,
): SubmitBallotResult {
  const sameRound = existing.filter(
    (item) =>
      item.participantId === ballot.participantId &&
      item.round === ballot.round,
  );

  if (sameRound.length === 0) {
    return { ballots: [...existing, ballot], status: 'CREATED' };
  }

  const isExactReplay = sameRound.some(
    (item) =>
      item.submissionId === ballot.submissionId &&
      sameSelection(item.selection, ballot.selection),
  );

  if (isExactReplay) {
    return { ballots: existing, status: 'DUPLICATE' };
  }

  throw new DomainError(
    'CONFLICTING_SUBMISSION',
    'Ya existe un voto para esta etapa; no se puede enviar otro distinto.',
    'submissionId',
  );
}
