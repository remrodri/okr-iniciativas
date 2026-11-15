import {
  createFirebaseClient,
  type FirebaseClient,
} from './firebaseClient';
import { readFirebaseConfig } from './firebaseConfig';

let runtime: FirebaseClient | null | undefined;

export function getFirebaseRuntime(): FirebaseClient | null {
  if (runtime !== undefined) {
    return runtime;
  }

  const config = readFirebaseConfig(import.meta.env);
  runtime = config === null ? null : createFirebaseClient(config);
  return runtime;
}
