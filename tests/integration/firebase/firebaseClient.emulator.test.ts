import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { afterAll, describe, expect, it } from 'vitest';

import { createFirebaseClient } from '@/infrastructure/firebase/firebaseClient';

const client = createFirebaseClient({
  apiKey: 'demo-key',
  authDomain: 'demo-okr.firebaseapp.com',
  projectId: 'demo-okr',
  appId: 'demo-app',
  useEmulators: true,
  emulatorHost: '127.0.0.1',
  appName: `emulator-${Date.now()}`,
});

afterAll(async () => {
  await client.dispose();
});

describe('Firebase con emuladores', () => {
  it('autentica de forma anónima y escribe/lee sin tocar producción', async () => {
    const credential = await client.signInAnonymously();
    expect(credential.user.uid).toMatch(/\w+/);

    const reference = doc(
      client.firestore,
      'healthcheck',
      credential.user.uid,
    );
    await setDoc(reference, { ok: true, projectId: 'demo-okr' });

    const stored = await getDoc(reference);
    expect(stored.data()).toEqual({ ok: true, projectId: 'demo-okr' });

    await deleteDoc(reference);
  });
});
