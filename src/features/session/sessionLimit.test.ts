import { describe, expect, it } from 'vitest';

import { DomainError } from '@/domain/errors';
import { LIMITS } from '@/domain/limits';
import type { SessionSnapshot } from '@/domain/ports';
import { SNAPSHOT_FORMAT_VERSION } from '@/domain/ports';
import { InMemorySessionRepository } from '@/infrastructure/browser-storage/memorySessionRepository';
import { saveSnapshotWithLimit } from './sessionLimit';

const now = '2026-11-14T10:00:00.000Z';

function snapshot(localId: string): SessionSnapshot {
  return {
    localId,
    sessionId: localId,
    revision: 1,
    savedAt: now,
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    state: {
      session: {
        id: localId,
        version: 1,
        stage: 'CONFIGURACION',
        x0: 'X0',
        xf: 'Xf',
        expectedParticipants: 6,
        initiativesPerParticipant: 5,
        finalistCount: null,
        iceConfig: null,
        paused: false,
        createdAt: now,
        updatedAt: now,
      },
      participants: [],
      initiatives: [],
      clarifications: [],
      ballots: [],
      iceEvaluations: [],
      ranking: [],
      audit: [],
    },
  };
}

async function fill(repository: InMemorySessionRepository, count: number) {
  for (let index = 0; index < count; index += 1) {
    await repository.save(snapshot(`local-${index}`));
  }
}

describe('límite de 20 sesiones locales', () => {
  it('acepta guardar la sesión número 20', async () => {
    const repository = new InMemorySessionRepository();
    await fill(repository, LIMITS.localSessionsMax - 1);

    await saveSnapshotWithLimit(repository, snapshot('local-19'));

    expect(await repository.count()).toBe(LIMITS.localSessionsMax);
  });

  it('rechaza la sesión 21 con un error accionable', async () => {
    const repository = new InMemorySessionRepository();
    await fill(repository, LIMITS.localSessionsMax);

    await expect(
      saveSnapshotWithLimit(repository, snapshot('local-20')),
    ).rejects.toMatchObject({
      code: 'SESSION_LIMIT_REACHED',
      message: expect.stringMatching(/exporta o elimina/i) as string,
    });
    expect(await repository.count()).toBe(LIMITS.localSessionsMax);
  });

  it('permite actualizar una sesión existente aunque haya 20', async () => {
    const repository = new InMemorySessionRepository();
    await fill(repository, LIMITS.localSessionsMax);

    await saveSnapshotWithLimit(
      repository,
      snapshot('local-0'),
    );

    expect(await repository.count()).toBe(LIMITS.localSessionsMax);
  });

  it('permite crear otra después de eliminar una', async () => {
    const repository = new InMemorySessionRepository();
    await fill(repository, LIMITS.localSessionsMax);
    await repository.delete('local-0');

    await saveSnapshotWithLimit(repository, snapshot('local-20'));

    expect(await repository.count()).toBe(LIMITS.localSessionsMax);
  });

  it('expone el código de error tipado', async () => {
    const repository = new InMemorySessionRepository();
    await fill(repository, LIMITS.localSessionsMax);

    try {
      await saveSnapshotWithLimit(repository, snapshot('local-20'));
      throw new Error('Se esperaba un límite.');
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
    }
  });
});
