import { doc, updateDoc, type Firestore } from 'firebase/firestore';

export const PRESENCE_HEARTBEAT_MS = 30_000;
export const PRESENCE_TIMEOUT_MS = 90_000;

export function isPresenceActive(
  lastSeenAtMillis: number | null,
  nowMillis = Date.now(),
): boolean {
  return (
    lastSeenAtMillis !== null &&
    lastSeenAtMillis <= nowMillis &&
    nowMillis - lastSeenAtMillis < PRESENCE_TIMEOUT_MS
  );
}

interface PresenceOptions {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly onError?: (error: Error) => void;
}

function report(options: PresenceOptions, caught: unknown) {
  if (caught instanceof Error) options.onError?.(caught);
}

export function startFacilitatorPresence(options: PresenceOptions): () => void {
  const reference = doc(options.firestore, 'sessions', options.sessionId);
  const write = (connected: boolean) =>
    updateDoc(reference, {
      facilitatorConnected: connected,
      facilitatorLastSeenAtMillis: Date.now(),
    }).catch((caught: unknown) => report(options, caught));
  void write(true);
  const interval = window.setInterval(() => void write(true), PRESENCE_HEARTBEAT_MS);
  const leave = () => void write(false);
  window.addEventListener('pagehide', leave);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener('pagehide', leave);
    leave();
  };
}

export function startParticipantPresence(
  options: PresenceOptions & { readonly participantId: string },
): () => void {
  const reference = doc(
    options.firestore,
    'sessions',
    options.sessionId,
    'participants',
    options.participantId,
  );
  const write = (connected: boolean) =>
    updateDoc(reference, {
      connected,
      lastSeenAtMillis: Date.now(),
    }).catch((caught: unknown) => report(options, caught));
  void write(true);
  const interval = window.setInterval(() => void write(true), PRESENCE_HEARTBEAT_MS);
  const leave = () => void write(false);
  window.addEventListener('pagehide', leave);
  return () => {
    window.clearInterval(interval);
    window.removeEventListener('pagehide', leave);
    leave();
  };
}
