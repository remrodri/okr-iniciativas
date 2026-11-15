import { useEffect, useState } from 'react';

import { getFirebaseRuntime } from '@/infrastructure/firebase/runtime';

export function useFirebaseAuthReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null) return;
    let active = true;
    void runtime.auth.authStateReady().then(() => {
      if (active) setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  return ready;
}

export function readableFirebaseError(error: Error): string {
  return 'code' in error && error.code === 'permission-denied'
    ? 'No se pudo validar el acceso. Espera la reconexión o usa tu clave de recuperación.'
    : error.message;
}
