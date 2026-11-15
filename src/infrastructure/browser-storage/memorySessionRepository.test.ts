import { describe, expect, it } from 'vitest';

import type { SessionSnapshot } from '@/domain/ports';
import { SNAPSHOT_FORMAT_VERSION } from '@/domain/ports';
import { InMemorySessionRepository } from './memorySessionRepository';

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
    ...overrides,
  };
}

describe('repositorio de sesiones en memoria', () => {
  it('guarda y recupera un snapshot por identificador local', async () => {
    const repository = new InMemorySessionRepository();
    await repository.save(snapshot('local-1'));

    const found = await repository.get('local-1');

    expect(found?.localId).toBe('local-1');
    expect(found?.state.session.x0).toBe('X0');
  });

  it('devuelve null para snapshots inexistentes', async () => {
    const repository = new InMemorySessionRepository();
    expect(await repository.get('nope')).toBeNull();
  });

  it('lista resúmenes ordenados por fecha descendente', async () => {
    const repository = new InMemorySessionRepository();
    await repository.save(snapshot('local-1', { savedAt: '2026-11-14T09:00:00.000Z' }));
    await repository.save(snapshot('local-2', { savedAt: '2026-11-14T11:00:00.000Z' }));

    const list = await repository.list();

    expect(list.map((item) => item.localId)).toEqual(['local-2', 'local-1']);
    expect(list[0]?.stage).toBe('CONFIGURACION');
  });

  it('borra un snapshot y mantiene el resto', async () => {
    const repository = new InMemorySessionRepository();
    await repository.save(snapshot('local-1'));
    await repository.save(snapshot('local-2'));

    await repository.delete('local-1');

    expect(await repository.get('local-1')).toBeNull();
    expect(await repository.get('local-2')).not.toBeNull();
    expect(await repository.count()).toBe(1);
  });

  it('sobrescribe el snapshot del mismo identificador local', async () => {
    const repository = new InMemorySessionRepository();
    await repository.save(snapshot('local-1'));
    await repository.save(snapshot('local-1', { revision: 2 }));

    expect(await repository.count()).toBe(1);
    expect((await repository.get('local-1'))?.revision).toBe(2);
  });
});
