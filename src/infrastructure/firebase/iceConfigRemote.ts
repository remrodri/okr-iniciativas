import { doc, updateDoc, type Firestore } from 'firebase/firestore';

import { assertIceConfigEditable, createIceConfig } from '@/domain/iceConfig';
import type { IceConfig, IceMethod, IceWeights, SessionStage } from '@/domain/types';

export interface SaveIceConfigInput {
  readonly firestore: Firestore;
  readonly sessionId: string;
  readonly method: IceMethod;
  readonly weights: IceWeights | null;
  readonly now: string;
}

export async function saveIceConfigRemote(
  input: SaveIceConfigInput,
): Promise<IceConfig> {
  const config = createIceConfig({
    method: input.method,
    weights: input.weights,
  });
  await updateDoc(doc(input.firestore, 'sessions', input.sessionId), {
    iceConfig: config,
    updatedAt: input.now,
  });
  return config;
}

export interface StartIceEvaluationInput extends SaveIceConfigInput {
  readonly stage: SessionStage;
}

export async function startIceEvaluationRemote(
  input: StartIceEvaluationInput,
): Promise<IceConfig> {
  assertIceConfigEditable(input.stage);
  const config = createIceConfig({
    method: input.method,
    weights: input.weights,
  });
  await updateDoc(doc(input.firestore, 'sessions', input.sessionId), {
    iceConfig: config,
    stage: 'EVALUACION_ICE',
    updatedAt: input.now,
  });
  return config;
}
