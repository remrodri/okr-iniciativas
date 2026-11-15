import type { AuditEvent, BallotRound } from './types';

export interface SubmissionSummary {
  readonly id: string;
  readonly participantId: string;
  readonly complete: boolean;
}

export interface EarlyCloseInput {
  readonly submissions: readonly SubmissionSummary[];
  readonly round: BallotRound | 'ICE';
  readonly actorId: string;
  readonly auditId: string;
  readonly now: string;
}

export interface EarlyCloseResult {
  readonly allowed: boolean;
  readonly completeSubmissionIds: readonly string[];
  readonly discardedPartialIds: readonly string[];
  readonly audit: AuditEvent;
}

export function evaluateEarlyClose(
  input: EarlyCloseInput,
): EarlyCloseResult {
  const complete = input.submissions.filter((item) => item.complete);
  const partial = input.submissions.filter((item) => !item.complete);
  const allowed = complete.length >= 2;

  return {
    allowed,
    completeSubmissionIds: complete.map((item) => item.id),
    discardedPartialIds: partial.map((item) => item.id),
    audit: {
      id: input.auditId,
      actorId: input.actorId,
      actorRole: 'FACILITATOR',
      action: `EARLY_CLOSE_${input.round}`,
      fromStage: input.round === 'ICE' ? 'EVALUACION_ICE' : 'DEPURACION',
      toStage: input.round === 'ICE' ? 'RESULTADO_FINAL' : 'CONFIGURACION_ICE',
      at: input.now,
      details: {
        incompleteParticipation: partial.length > 0,
        discardedPartials: partial.length,
        completeSubmissions: complete.length,
      },
    },
  };
}
