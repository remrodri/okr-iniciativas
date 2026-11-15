import type {
  AuditEvent,
  ClarificationRequest,
  IceEvaluation,
  Initiative,
  Participant,
  RankingEntry,
  RefinementBallot,
  Session,
} from './types';

export const SNAPSHOT_FORMAT_VERSION = 1;

export interface SessionState {
  readonly session: Session;
  readonly participants: readonly Participant[];
  readonly initiatives: readonly Initiative[];
  readonly clarifications: readonly ClarificationRequest[];
  readonly ballots: readonly RefinementBallot[];
  readonly iceEvaluations: readonly IceEvaluation[];
  readonly ranking: readonly RankingEntry[];
  readonly audit: readonly AuditEvent[];
}

export interface SessionSnapshot {
  readonly localId: string;
  readonly sessionId: string;
  readonly revision: number;
  readonly savedAt: string;
  readonly formatVersion: number;
  readonly state: SessionState;
}

export interface SnapshotSummary {
  readonly localId: string;
  readonly sessionId: string;
  readonly revision: number;
  readonly savedAt: string;
  readonly stage: Session['stage'];
}

export interface SessionRepository {
  save(snapshot: SessionSnapshot): Promise<void>;
  get(localId: string): Promise<SessionSnapshot | null>;
  list(): Promise<readonly SnapshotSummary[]>;
  delete(localId: string): Promise<void>;
  count(): Promise<number>;
}

export interface ParticipantDraftStore {
  saveDraft(key: string, value: unknown): Promise<void>;
  getDraft<T>(key: string): Promise<T | null>;
  clear(key: string): Promise<void>;
}
