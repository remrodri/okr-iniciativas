export type DomainErrorCode =
  | 'INVALID_SCENARIO_TEXT'
  | 'INVALID_PARTICIPANT_COUNT'
  | 'INVALID_INITIATIVES_PER_PARTICIPANT'
  | 'INVALID_TOTAL_INITIATIVES'
  | 'INVALID_INITIATIVE_TEXT'
  | 'INVALID_INITIATIVE_COUNT'
  | 'INVALID_FINALIST_COUNT'
  | 'INVALID_BALLOT_SIZE'
  | 'DUPLICATE_SELECTION'
  | 'UNKNOWN_SELECTION'
  | 'INVALID_BALLOT_ROUND'
  | 'CONFLICTING_SUBMISSION'
  | 'INVALID_ICE_METHOD'
  | 'INVALID_ICE_WEIGHTS'
  | 'INVALID_ICE_SCORE'
  | 'INVALID_ICE_RATINGS'
  | 'ICE_CONFIG_LOCKED'
  | 'INVALID_STAGE_TRANSITION'
  | 'INVALID_STAGE_ACTION'
  | 'INSUFFICIENT_COMPLETE_SUBMISSIONS'
  | 'INVALID_TIE_DECISION'
  | 'SESSION_EXPIRED'
  | 'SESSION_NOT_FINALIZED'
  | 'INVALID_SESSION_REOPEN'
  | 'INVALID_ALIAS_COUNT'
  | 'SESSION_LIMIT_REACHED'
  | 'INVALID_LIMIT';

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly field: string | undefined;

  constructor(code: DomainErrorCode, message: string, field?: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.field = field;
  }
}

export function isDomainError(value: unknown): value is DomainError {
  return value instanceof DomainError;
}
