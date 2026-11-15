import { DomainError } from './errors';

export const LIMITS = {
  participantsVotingMin: 2,
  participantsMax: 40,
  initiativesPerParticipantMin: 1,
  initiativesPerParticipantMax: 10,
  totalInitiativesMax: 400,
  finalistsMax: 40,
  initiativeTextMax: 300,
  scenarioTextMax: 1000,
  iceScoreMin: 1,
  iceScoreMax: 10,
  sessionRecoveryHours: 24,
  localSessionsMax: 20,
} as const;

export function assertScenarioText(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || value.length > LIMITS.scenarioTextMax) {
    const label = field === 'x0' ? 'X0' : field === 'xf' ? 'Xf' : field;
    throw new DomainError(
      'INVALID_SCENARIO_TEXT',
      `El campo ${label} debe tener entre 1 y ${LIMITS.scenarioTextMax} caracteres.`,
      field,
    );
  }
  return trimmed;
}

export function assertInitiativeText(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0 || value.length > LIMITS.initiativeTextMax) {
    throw new DomainError(
      'INVALID_INITIATIVE_TEXT',
      `La iniciativa debe tener entre 1 y ${LIMITS.initiativeTextMax} caracteres.`,
      'text',
    );
  }
  return trimmed;
}

export function assertParticipantConfigCount(value: number): number {
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > LIMITS.participantsMax
  ) {
    throw new DomainError(
      'INVALID_PARTICIPANT_COUNT',
      `La cantidad de participantes debe ser un entero entre 1 y ${LIMITS.participantsMax}.`,
      'expectedParticipants',
    );
  }
  return value;
}

export function assertInitiativeCountPerParticipant(value: number): number {
  if (
    !Number.isInteger(value) ||
    value < LIMITS.initiativesPerParticipantMin ||
    value > LIMITS.initiativesPerParticipantMax
  ) {
    throw new DomainError(
      'INVALID_INITIATIVES_PER_PARTICIPANT',
      `Las iniciativas por participante deben ser un entero entre ${LIMITS.initiativesPerParticipantMin} y ${LIMITS.initiativesPerParticipantMax}.`,
      'initiativesPerParticipant',
    );
  }
  return value;
}

export function assertTotalInitiatives(value: number): number {
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > LIMITS.totalInitiativesMax
  ) {
    throw new DomainError(
      'INVALID_TOTAL_INITIATIVES',
      `El total de iniciativas no puede superar ${LIMITS.totalInitiativesMax}.`,
      'totalInitiatives',
    );
  }
  return value;
}
