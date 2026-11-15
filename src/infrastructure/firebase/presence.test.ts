import { afterEach, describe, expect, it, vi } from 'vitest';

const firebase = vi.hoisted(() => ({
  updateDoc: vi.fn(() => Promise.resolve()),
  doc: vi.fn(() => ({ path: 'presence' })),
}));

vi.mock('firebase/firestore', () => firebase);

import {
  isPresenceActive,
  PRESENCE_HEARTBEAT_MS,
  PRESENCE_TIMEOUT_MS,
  startParticipantPresence,
} from './presence';

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('presencia remota', () => {
  it('permanece activa dentro de la ventana de 90 segundos', () => {
    expect(isPresenceActive(10_000, 10_000 + PRESENCE_TIMEOUT_MS - 1)).toBe(true);
  });

  it('vence al alcanzar 90 segundos sin heartbeat', () => {
    expect(isPresenceActive(10_000, 10_000 + PRESENCE_TIMEOUT_MS)).toBe(false);
  });

  it('rechaza marcas ausentes o futuras', () => {
    expect(isPresenceActive(null, 10_000)).toBe(false);
    expect(isPresenceActive(20_000, 10_000)).toBe(false);
  });

  it('renueva presencia y marca salida al cerrar la página', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const stop = startParticipantPresence({
      firestore: {} as never,
      sessionId: 'session-1',
      participantId: 'participant-1',
    });

    expect(firebase.updateDoc).toHaveBeenLastCalledWith(
      expect.anything(),
      { connected: true, lastSeenAtMillis: 10_000 },
    );
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_MS);
    expect(firebase.updateDoc).toHaveBeenCalledTimes(2);

    window.dispatchEvent(new Event('pagehide'));
    expect(firebase.updateDoc).toHaveBeenLastCalledWith(
      expect.anything(),
      { connected: false, lastSeenAtMillis: 40_000 },
    );
    stop();
  });
});
