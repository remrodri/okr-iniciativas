import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import type { SessionSnapshot } from '@/domain/ports';
import { SNAPSHOT_FORMAT_VERSION } from '@/domain/ports';
import { IndexedDbSessionRepository } from './indexedDbSessionRepository';

const now = '2026-11-14T10:00:00.000Z';

function snapshot(
  localId: string,
  overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot {
  return {
    localId,
    sessionId: 's1',
    revision: 1,
    savedAt: now,
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    state: {
      session: {
        id: 's1',
        version: 1,
        stage: 'BRAINSTORMING',
        x0: 'Hoy no hay onboarding',
        xf: 'Cada persona se activa en un día',
        expectedParticipants: 6,
        initiativesPerParticipant: 5,
        finalistCount: null,
        iceConfig: null,
        paused: false,
        createdAt: now,
        updatedAt: now,
      },
      participants: [
        {
          id: 'p1',
          alias: 'Faro',
          realName: 'Ana',
          accessTokenId: 'token-1',
          progress: {
            brainstormingSubmitted: true,
            refinementSubmitted: false,
            tieBreakSubmitted: false,
            iceSubmitted: false,
          },
          connected: true,
        },
      ],
      initiatives: [
        {
          id: 'i1',
          text: 'Mejorar onboarding',
          authorIds: ['p1'],
          originals: [],
          status: 'ACTIVE',
          mergedIntoId: null,
          revision: 1,
        },
      ],
      clarifications: [],
      ballots: [],
      iceEvaluations: [],
      ranking: [],
      audit: [],
    },
    ...overrides,
  };
}

function dbName(): string {
  return `test-db-${Math.random().toString(36).slice(2)}`;
}

describe('IndexedDB del facilitador', () => {
  it('recarga una sesión completa sin pérdida', async () => {
    const name = dbName();
    const first = new IndexedDbSessionRepository(name);
    await first.save(snapshot('local-1'));

    const reloaded = new IndexedDbSessionRepository(name);
    const found = await reloaded.get('local-1');

    expect(found).toEqual(snapshot('local-1'));
    expect(found?.state.participants[0]?.alias).toBe('Faro');
    expect(found?.state.initiatives[0]?.text).toBe('Mejorar onboarding');
  });

  it('lista por fecha descendente y cuenta sesiones', async () => {
    const repository = new IndexedDbSessionRepository(dbName());
    await repository.save(
      snapshot('local-1', { savedAt: '2026-11-14T09:00:00.000Z' }),
    );
    await repository.save(
      snapshot('local-2', { savedAt: '2026-11-14T11:00:00.000Z' }),
    );

    const list = await repository.list();

    expect(list.map((item) => item.localId)).toEqual(['local-2', 'local-1']);
    expect(await repository.count()).toBe(2);
  });

  it('sobrescribe una revisión y permite borrar', async () => {
    const repository = new IndexedDbSessionRepository(dbName());
    await repository.save(snapshot('local-1'));
    await repository.save(snapshot('local-1', { revision: 2 }));
    expect((await repository.get('local-1'))?.revision).toBe(2);
    expect(await repository.count()).toBe(1);

    await repository.delete('local-1');

    expect(await repository.get('local-1')).toBeNull();
    expect(await repository.count()).toBe(0);
  });

  it('ignora snapshots con versión de formato desconocida', async () => {
    const repository = new IndexedDbSessionRepository(dbName());
    await repository.save(snapshot('local-1', { formatVersion: 999 }));

    expect(await repository.get('local-1')).toBeNull();
    expect(await repository.list()).toEqual([]);
  });
});
