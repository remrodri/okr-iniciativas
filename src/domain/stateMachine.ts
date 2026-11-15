import { DomainError } from './errors';
import type { ActorRole, AuditEvent, Session, SessionStage } from './types';

export type StageAction =
  | 'OPEN_WAITING_ROOM'
  | 'OPEN_BRAINSTORMING'
  | 'CLOSE_BRAINSTORMING'
  | 'OPEN_REFINEMENT'
  | 'OPEN_TIEBREAK'
  | 'OPEN_ICE_CONFIG'
  | 'OPEN_ICE_EVALUATION'
  | 'PUBLISH_RESULTS'
  | 'FINALIZE'
  | 'REOPEN';

const TRANSITIONS: Readonly<
  Record<SessionStage, Partial<Record<StageAction, SessionStage>>>
> = {
  CONFIGURACION: { OPEN_WAITING_ROOM: 'SALA_DE_ESPERA' },
  SALA_DE_ESPERA: { OPEN_BRAINSTORMING: 'BRAINSTORMING' },
  BRAINSTORMING: { CLOSE_BRAINSTORMING: 'REVISION' },
  REVISION: {
    OPEN_REFINEMENT: 'DEPURACION',
    OPEN_ICE_CONFIG: 'CONFIGURACION_ICE',
  },
  DEPURACION: {
    OPEN_TIEBREAK: 'DESEMPATE_DEPURACION',
    OPEN_ICE_CONFIG: 'CONFIGURACION_ICE',
  },
  DESEMPATE_DEPURACION: { OPEN_ICE_CONFIG: 'CONFIGURACION_ICE' },
  CONFIGURACION_ICE: { OPEN_ICE_EVALUATION: 'EVALUACION_ICE' },
  EVALUACION_ICE: { PUBLISH_RESULTS: 'RESULTADO_FINAL' },
  RESULTADO_FINAL: { FINALIZE: 'FINALIZADA' },
  FINALIZADA: { REOPEN: 'RESULTADO_FINAL' },
};

export interface StageActionInput {
  readonly session: Session;
  readonly action: StageAction;
  readonly actorId: string;
  readonly actorRole: ActorRole;
  readonly now: string;
  readonly auditId: string;
}

export interface StageActionResult {
  readonly session: Session;
  readonly audit: AuditEvent;
}

export function applyStageAction(input: StageActionInput): StageActionResult {
  if (input.actorRole !== 'FACILITATOR') {
    throw new DomainError(
      'INVALID_STAGE_ACTION',
      'Solo el facilitador puede cambiar de etapa.',
      'actorRole',
    );
  }

  const nextStage = TRANSITIONS[input.session.stage][input.action];

  if (nextStage === undefined) {
    throw new DomainError(
      'INVALID_STAGE_TRANSITION',
      `La acción ${input.action} no es válida desde ${input.session.stage}.`,
      'stage',
    );
  }

  return {
    session: {
      ...input.session,
      stage: nextStage,
      version: input.session.version + 1,
      updatedAt: input.now,
    },
    audit: {
      id: input.auditId,
      actorId: input.actorId,
      actorRole: input.actorRole,
      action: input.action,
      fromStage: input.session.stage,
      toStage: nextStage,
      at: input.now,
    },
  };
}
