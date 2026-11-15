import { DomainError } from './errors';
import { assertInitiativeText } from './limits';
import type {
  ClarificationRequest,
  Initiative,
  InitiativeOriginal,
} from './types';

export interface CreateInitiativeInput {
  readonly id: string;
  readonly text: string;
  readonly authorIds: readonly string[];
  readonly now: string;
}

export function createInitiative(input: CreateInitiativeInput): Initiative {
  if (input.authorIds.length === 0) {
    throw new DomainError(
      'INVALID_INITIATIVE_TEXT',
      'La iniciativa debe tener al menos un autor.',
      'authorIds',
    );
  }

  return {
    id: input.id,
    text: assertInitiativeText(input.text),
    authorIds: [...input.authorIds],
    originals: [],
    status: 'ACTIVE',
    mergedIntoId: null,
    revision: 1,
  };
}

export function correctInitiativeText(
  initiative: Initiative,
  text: string,
): Initiative {
  return {
    ...initiative,
    text: assertInitiativeText(text),
    revision: initiative.revision + 1,
  };
}

export interface FuseInitiativesInput {
  readonly target: Initiative;
  readonly sources: readonly Initiative[];
  readonly mergedText: string;
  readonly now: string;
}

export interface FuseInitiativesResult {
  readonly consolidated: Initiative;
  readonly sources: readonly Initiative[];
}

function originalsOf(initiative: Initiative, now: string): InitiativeOriginal[] {
  if (initiative.originals.length > 0) {
    return [...initiative.originals];
  }

  return initiative.authorIds.map((authorId, index) => ({
    id: `${initiative.id}:original:${index}`,
    text: initiative.text,
    authorId,
    fusedAt: now,
  }));
}

export function fuseInitiatives(
  input: FuseInitiativesInput,
): FuseInitiativesResult {
  const { target, sources, now } = input;

  if (sources.length === 0) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      'La fusión requiere al menos una propuesta adicional.',
      'sources',
    );
  }

  const sourceIds = new Set(sources.map((source) => source.id));
  if (sourceIds.size !== sources.length || sourceIds.has(target.id)) {
    throw new DomainError(
      'INVALID_INITIATIVE_COUNT',
      'Las propuestas a fusionar deben ser distintas entre sí y de la principal.',
      'sources',
    );
  }

  const mergedText = assertInitiativeText(input.mergedText);
  const authorIds = [
    ...new Set([
      ...target.authorIds,
      ...sources.flatMap((source) => source.authorIds),
    ]),
  ];

  const originals = [
    ...originalsOf(target, now),
    ...sources.flatMap((source) => originalsOf(source, now)),
  ];

  return {
    consolidated: {
      ...target,
      text: mergedText,
      authorIds,
      originals,
      status: 'ACTIVE',
      mergedIntoId: null,
      revision: target.revision + 1,
    },
    sources: sources.map((source) => ({
      ...source,
      status: 'FUSED',
      mergedIntoId: target.id,
      revision: source.revision + 1,
    })),
  };
}

export interface CreateClarificationInput {
  readonly id: string;
  readonly initiativeId: string;
  readonly message: string;
  readonly now: string;
}

export function createClarificationRequest(
  input: CreateClarificationInput,
): ClarificationRequest {
  const message = assertInitiativeText(input.message);

  return {
    id: input.id,
    initiativeId: input.initiativeId,
    message,
    status: 'OPEN',
    createdAt: input.now,
    responseText: null,
  };
}

export function respondToClarification(
  request: ClarificationRequest,
  responseText: string,
): ClarificationRequest {
  if (request.status === 'RESOLVED') {
    throw new DomainError(
      'INVALID_STAGE_ACTION',
      'La solicitud de aclaración ya fue respondida.',
      'status',
    );
  }

  return {
    ...request,
    responseText: assertInitiativeText(responseText),
    status: 'RESOLVED',
  };
}
