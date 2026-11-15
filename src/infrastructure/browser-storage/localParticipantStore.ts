export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ParticipantPendingSubmission {
  readonly kind: 'BRAINSTORMING' | 'REFINEMENT' | 'TIEBREAK' | 'ICE';
  readonly submissionId: string;
  readonly payload: unknown;
}

export interface ParticipantLocalState {
  readonly sessionId: string;
  readonly participantId: string;
  readonly accessTokenId: string;
  readonly alias?: string;
  readonly draft: string;
  readonly pending?: ParticipantPendingSubmission;
}

export interface ParticipantLocalStore {
  load(sessionId: string): ParticipantLocalState | null;
  save(state: ParticipantLocalState): void;
  clear(sessionId: string): void;
}

const KEY_PREFIX = 'okr:participant:';

function keyFor(sessionId: string): string {
  return `${KEY_PREFIX}${sessionId}`;
}

function isState(value: unknown, sessionId: string): value is ParticipantLocalState {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<ParticipantLocalState>;
  return (
    candidate.sessionId === sessionId &&
    typeof candidate.participantId === 'string' &&
    candidate.participantId.length > 0 &&
    typeof candidate.accessTokenId === 'string' &&
    candidate.accessTokenId.length > 0 &&
    (candidate.alias === undefined || typeof candidate.alias === 'string') &&
    typeof candidate.draft === 'string'
  );
}

export function createLocalParticipantStore(
  storage: StorageLike = globalThis.localStorage,
): ParticipantLocalStore {
  return {
    load(sessionId) {
      const raw = storage.getItem(keyFor(sessionId));
      if (raw === null) {
        return null;
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        return isState(parsed, sessionId) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(state) {
      if (!isState(state, state.sessionId)) {
        throw new Error('El estado local del participante no es válido.');
      }
      storage.setItem(keyFor(state.sessionId), JSON.stringify(state));
    },
    clear(sessionId) {
      storage.removeItem(keyFor(sessionId));
    },
  };
}
