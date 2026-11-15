import type {
  SessionRepository,
  SessionSnapshot,
  SnapshotSummary,
} from '@/domain/ports';

export class InMemorySessionRepository implements SessionRepository {
  private readonly snapshots = new Map<string, SessionSnapshot>();

  async save(snapshot: SessionSnapshot): Promise<void> {
    this.snapshots.set(snapshot.localId, snapshot);
  }

  async get(localId: string): Promise<SessionSnapshot | null> {
    return this.snapshots.get(localId) ?? null;
  }

  async list(): Promise<readonly SnapshotSummary[]> {
    return [...this.snapshots.values()]
      .sort(
        (left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt),
      )
      .map((snapshot) => ({
        localId: snapshot.localId,
        sessionId: snapshot.sessionId,
        revision: snapshot.revision,
        savedAt: snapshot.savedAt,
        stage: snapshot.state.session.stage,
      }));
  }

  async delete(localId: string): Promise<void> {
    this.snapshots.delete(localId);
  }

  async count(): Promise<number> {
    return this.snapshots.size;
  }
}
