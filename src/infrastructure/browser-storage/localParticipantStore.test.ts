import { describe, expect, it } from 'vitest';

import {
  createLocalParticipantStore,
  type StorageLike,
} from './localParticipantStore';

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const state = {
  sessionId: 's1',
  participantId: 'p1',
  accessTokenId: 'token-1',
  draft: 'Mejorar el onboarding',
  pending: {
    kind: 'BRAINSTORMING' as const,
    submissionId: 'sub-1',
    payload: { text: 'Mejorar el onboarding' },
  },
};

describe('identidad y borradores del participante', () => {
  it('recupera el borrador tras una recarga', () => {
    const storage = new MemoryStorage();
    const first = createLocalParticipantStore(storage);
    first.save(state);

    const reloaded = createLocalParticipantStore(storage);

    expect(reloaded.load('s1')).toEqual(state);
  });

  it('aísla el estado por sesión', () => {
    const store = createLocalParticipantStore(new MemoryStorage());
    store.save(state);

    expect(store.load('s1')?.draft).toBe('Mejorar el onboarding');
    expect(store.load('s2')).toBeNull();
  });

  it('elimina los datos locales al finalizar o abandonar', () => {
    const store = createLocalParticipantStore(new MemoryStorage());
    store.save(state);

    store.clear('s1');

    expect(store.load('s1')).toBeNull();
  });

  it('ignora contenido corrupto o incompleto', () => {
    const storage = new MemoryStorage();
    storage.setItem('okr:participant:s1', '{no-json');
    storage.setItem('okr:participant:s2', JSON.stringify({ sessionId: 's2' }));

    const store = createLocalParticipantStore(storage);

    expect(store.load('s1')).toBeNull();
    expect(store.load('s2')).toBeNull();
  });
});
