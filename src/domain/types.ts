export type SessionStage =
  | 'CONFIGURACION'
  | 'SALA_DE_ESPERA'
  | 'BRAINSTORMING'
  | 'REVISION'
  | 'DEPURACION'
  | 'DESEMPATE_DEPURACION'
  | 'CONFIGURACION_ICE'
  | 'EVALUACION_ICE'
  | 'RESULTADO_FINAL'
  | 'FINALIZADA';

export type IceMethod = 'MULTIPLICATIVE' | 'WEIGHTED';

export interface IceWeights {
  readonly impact: number;
  readonly confidence: number;
  readonly ease: number;
}

export interface IceConfig {
  readonly method: IceMethod;
  readonly weights: IceWeights | null;
}

export interface ParticipantProgress {
  readonly brainstormingSubmitted: boolean;
  readonly refinementSubmitted: boolean;
  readonly tieBreakSubmitted: boolean;
  readonly iceSubmitted: boolean;
}

export interface Participant {
  readonly id: string;
  readonly alias: string;
  readonly realName: string;
  readonly accessTokenId: string;
  readonly progress: ParticipantProgress;
  readonly connected: boolean;
}

export interface RefinementTieState {
  readonly candidateIds: readonly string[];
  readonly slotsRemaining: number;
}

export interface Session {
  readonly id: string;
  readonly creatorUid?: string;
  readonly version: number;
  readonly stage: SessionStage;
  readonly x0: string;
  readonly xf: string;
  readonly expectedParticipants: number;
  readonly initiativesPerParticipant: number;
  readonly finalistCount: number | null;
  readonly finalistIds?: readonly string[];
  readonly tieBreak?: RefinementTieState | null;
  readonly iceConfig: IceConfig | null;
  readonly paused: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly finalizedAt?: string;
  readonly expiresAt?: string;
}

export interface InitiativeOriginal {
  readonly id: string;
  readonly text: string;
  readonly authorId: string;
  readonly fusedAt: string;
}

export interface Initiative {
  readonly id: string;
  readonly text: string;
  readonly authorIds: readonly string[];
  readonly originals: readonly InitiativeOriginal[];
  readonly status: 'ACTIVE' | 'FUSED';
  readonly mergedIntoId: string | null;
  readonly revision: number;
}

export type ClarificationStatus = 'OPEN' | 'RESOLVED';

export interface ClarificationRequest {
  readonly id: string;
  readonly initiativeId: string;
  readonly message: string;
  readonly status: ClarificationStatus;
  readonly createdAt: string;
  readonly responseText: string | null;
}

export type BallotRound = 'REFINEMENT' | 'TIEBREAK';

export interface RefinementBallot {
  readonly id: string;
  readonly participantId: string;
  readonly round: BallotRound;
  readonly selection: readonly string[];
  readonly submissionId: string;
  readonly submittedAt: string;
}

export interface IceScores {
  readonly impact: number;
  readonly confidence: number;
  readonly ease: number;
}

export interface IceEvaluation {
  readonly id: string;
  readonly participantId: string;
  readonly ratings: Readonly<Record<string, IceScores>>;
  readonly submissionId: string;
  readonly submittedAt: string;
}

export interface RankingEntry {
  readonly initiativeId: string;
  readonly impactMedian: number;
  readonly confidenceMedian: number;
  readonly easeMedian: number;
  readonly score: number;
  readonly position: number;
}

export type ActorRole = 'FACILITATOR' | 'PARTICIPANT' | 'SYSTEM';

export interface AuditEvent {
  readonly id: string;
  readonly actorId: string;
  readonly actorRole: ActorRole;
  readonly action: string;
  readonly fromStage: SessionStage | null;
  readonly toStage: SessionStage | null;
  readonly at: string;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}
