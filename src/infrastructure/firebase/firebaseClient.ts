import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously as firebaseSignInAnonymously,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';

export interface FirebaseRuntimeConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly appId: string;
  readonly storageBucket?: string;
  readonly messagingSenderId?: string;
  readonly useEmulators: boolean;
  readonly emulatorHost: string;
  readonly appName?: string;
}

export interface FirebaseClient {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly firestore: Firestore;
  signInAnonymously(): Promise<UserCredential>;
  dispose(): Promise<void>;
}

export function createFirebaseClient(
  config: FirebaseRuntimeConfig,
): FirebaseClient {
  const app = initializeApp(
    {
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      projectId: config.projectId,
      appId: config.appId,
      ...(config.storageBucket === undefined
        ? {}
        : { storageBucket: config.storageBucket }),
      ...(config.messagingSenderId === undefined
        ? {}
        : { messagingSenderId: config.messagingSenderId }),
    },
    config.appName,
  );

  const auth = getAuth(app);
  const firestore = getFirestore(app);

  if (config.useEmulators) {
    connectAuthEmulator(auth, `http://${config.emulatorHost}:9099`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(firestore, config.emulatorHost, 8080);
  }

  return {
    app,
    auth,
    firestore,
    signInAnonymously: () => firebaseSignInAnonymously(auth),
    dispose: () => deleteApp(app),
  };
}
