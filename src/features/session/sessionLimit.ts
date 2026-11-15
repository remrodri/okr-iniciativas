import { DomainError } from '@/domain/errors';
import { LIMITS } from '@/domain/limits';
import type {
  SessionRepository,
  SessionSnapshot,
} from '@/domain/ports';

export async function assertLocalSessionCapacity(
  repository: Pick<SessionRepository, 'count' | 'get'>,
  localId: string,
): Promise<void> {
  const existing = await repository.get(localId);
  if (existing !== null) {
    return;
  }

  const count = await repository.count();
  if (count >= LIMITS.localSessionsMax) {
    throw new DomainError(
      'SESSION_LIMIT_REACHED',
      `El navegador conserva ${LIMITS.localSessionsMax} sesiones locales. Exporta o elimina una antes de crear o importar otra.`,
      'localSessions',
    );
  }
}

export async function saveSnapshotWithLimit(
  repository: SessionRepository,
  snapshot: SessionSnapshot,
): Promise<void> {
  await assertLocalSessionCapacity(repository, snapshot.localId);
  await repository.save(snapshot);
}
