import type {
  SessionRepository,
  SessionSnapshot,
  SnapshotSummary,
} from '@/domain/ports';
import { SNAPSHOT_FORMAT_VERSION } from '@/domain/ports';

const STORE_NAME = 'sessions';

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('Error de IndexedDB.'));
  });
}

function hasSnapshotShape(value: unknown): value is SessionSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<SessionSnapshot>;
  return (
    typeof candidate.formatVersion === 'number' &&
    typeof candidate.localId === 'string' &&
    typeof candidate.sessionId === 'string' &&
    typeof candidate.revision === 'number' &&
    typeof candidate.savedAt === 'string' &&
    typeof candidate.state === 'object' &&
    candidate.state !== null
  );
}

function isValidSnapshot(value: unknown): value is SessionSnapshot {
  return (
    hasSnapshotShape(value) &&
    value.formatVersion === SNAPSHOT_FORMAT_VERSION
  );
}

export class IndexedDbSessionRepository implements SessionRepository {
  private readonly dbName: string;
  private readonly factory: IDBFactory;
  private database: Promise<IDBDatabase> | null = null;

  constructor(dbName = 'okr-iniciativas', factory?: IDBFactory) {
    this.dbName = dbName;
    this.factory = factory ?? globalThis.indexedDB;
  }

  private open(): Promise<IDBDatabase> {
    if (this.database !== null) {
      return this.database;
    }

    this.database = new Promise((resolve, reject) => {
      const request = this.factory.open(this.dbName, 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'localId',
          });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('No se pudo abrir IndexedDB.'));
    });

    return this.database;
  }

  private async transaction(
    mode: IDBTransactionMode,
  ): Promise<IDBObjectStore> {
    const db = await this.open();
    return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }

  async save(snapshot: SessionSnapshot): Promise<void> {
    if (!hasSnapshotShape(snapshot)) {
      throw new Error('El snapshot no tiene un formato válido.');
    }
    const store = await this.transaction('readwrite');
    await requestToPromise(store.put(snapshot));
  }

  async get(localId: string): Promise<SessionSnapshot | null> {
    const store = await this.transaction('readonly');
    const value: unknown = await requestToPromise(store.get(localId));
    return isValidSnapshot(value) ? value : null;
  }

  async list(): Promise<readonly SnapshotSummary[]> {
    const store = await this.transaction('readonly');
    const values: unknown[] = await requestToPromise(store.getAll());
    return values
      .filter(isValidSnapshot)
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
    const store = await this.transaction('readwrite');
    await requestToPromise(store.delete(localId));
  }

  async count(): Promise<number> {
    const store = await this.transaction('readonly');
    return requestToPromise(store.count());
  }
}
