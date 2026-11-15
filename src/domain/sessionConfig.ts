import {
  assertInitiativeCountPerParticipant,
  assertParticipantConfigCount,
  assertScenarioText,
  assertTotalInitiatives,
} from './limits';

export interface SessionConfigInput {
  readonly x0: string;
  readonly xf: string;
  readonly expectedParticipants: number;
  readonly initiativesPerParticipant: number;
}

export interface SessionConfig {
  readonly x0: string;
  readonly xf: string;
  readonly expectedParticipants: number;
  readonly initiativesPerParticipant: number;
  readonly totalInitiatives: number;
}

export function validateSessionConfig(
  input: SessionConfigInput,
): SessionConfig {
  const x0 = assertScenarioText(input.x0, 'x0');
  const xf = assertScenarioText(input.xf, 'xf');
  const expectedParticipants = assertParticipantConfigCount(
    input.expectedParticipants,
  );
  const initiativesPerParticipant = assertInitiativeCountPerParticipant(
    input.initiativesPerParticipant,
  );
  const totalInitiatives = assertTotalInitiatives(
    expectedParticipants * initiativesPerParticipant,
  );

  return {
    x0,
    xf,
    expectedParticipants,
    initiativesPerParticipant,
    totalInitiatives,
  };
}
