import type { FirebaseRuntimeConfig } from './firebaseClient';

const REQUIRED_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export function readFirebaseConfig(
  env: Record<string, string | undefined>,
): FirebaseRuntimeConfig | null {
  const missing = REQUIRED_KEYS.filter((key) => {
    const value = env[key];
    return value === undefined || value.trim().length === 0;
  });

  if (missing.length > 0) {
    return null;
  }

  return {
    apiKey: env.VITE_FIREBASE_API_KEY as string,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN as string,
    projectId: env.VITE_FIREBASE_PROJECT_ID as string,
    appId: env.VITE_FIREBASE_APP_ID as string,
    ...(env.VITE_FIREBASE_STORAGE_BUCKET === undefined
      ? {}
      : { storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET }),
    ...(env.VITE_FIREBASE_MESSAGING_SENDER_ID === undefined
      ? {}
      : {
          messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        }),
    useEmulators: env.VITE_FIREBASE_USE_EMULATORS === 'true',
    emulatorHost: env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1',
  };
}
