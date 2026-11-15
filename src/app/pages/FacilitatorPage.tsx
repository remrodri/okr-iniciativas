import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

import { FacilitatorPanel } from '@/features/facilitator/FacilitatorPanel';
import { SessionStageControls } from '@/features/facilitator/SessionStageControls';
import { BackupExportButton } from '@/features/excel/BackupExportButton';
import { SharedReportButton } from '@/features/excel/SharedReportButton';
import type { SessionSnapshot } from '@/domain/ports';
import { IceConfigForm } from '@/features/ice/IceConfigForm';
import { RefinementControl } from '@/features/refinement/RefinementControl';
import { ResultsPanel } from '@/features/results/ResultsPanel';
import { ReviewPanel } from '@/features/review/ReviewPanel';
import { getFirebaseRuntime } from '@/infrastructure/firebase/runtime';
import { changeStageRemote } from '@/infrastructure/firebase/stageRemote';
import { loadSessionSnapshotRemote } from '@/infrastructure/firebase/snapshotRemote';
import type { StageAction } from '@/domain/stateMachine';
import {
  saveIceConfigRemote,
  startIceEvaluationRemote,
} from '@/infrastructure/firebase/iceConfigRemote';
import {
  continueWithIncompleteRemote,
  decideTieRemote,
  openRefinementRemote,
  resolveRefinementRemote,
  skipRefinementRemote,
  subscribeRefinementControl,
  type RefinementControlData,
} from '@/infrastructure/firebase/refinementControl';
import {
  correctInitiativeRemote,
  fuseInitiativesRemote,
  requestClarificationRemote,
  subscribeReviewData,
  type ReviewData,
} from '@/infrastructure/firebase/reviewActions';
import {
  subscribeSessionPanel,
  type SessionPanelData,
} from '@/infrastructure/firebase/sessionPanel';
import {
  publishResultsRemote,
  subscribeResults,
  type ResultsData,
} from '@/infrastructure/firebase/resultsRemote';
import {
  finalizeRemoteSession,
  reopenRemoteSession,
} from '@/infrastructure/firebase/sessionLifecycle';
import { PlaceholderPage } from './PlaceholderPage';

interface FacilitatorLocationState {
  readonly facilitatorToken?: string;
  readonly participantCredentials?: readonly {
    readonly participantId: string;
    readonly alias: string;
    readonly token: string;
  }[];
}

export function FacilitatorPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const state = location.state as FacilitatorLocationState | null;
  const [data, setData] = useState<SessionPanelData | null>(null);
  const [review, setReview] = useState<ReviewData>({
    initiatives: [],
    clarifications: [],
  });
  const [refinement, setRefinement] = useState<RefinementControlData>({
    ballots: [],
    finalistCount: null,
    finalistIds: [],
    tieBreak: null,
    expectedParticipants: 0,
    iceConfig: null,
    stage: '',
  });
  const [results, setResults] = useState<ResultsData>({
    stage: 'CONFIGURACION',
    expiresAt: null,
    ranking: [],
    authors: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [exportSnapshot, setExportSnapshot] = useState<SessionSnapshot | null>(null);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null) {
      setError('Firebase no está configurado en este entorno.');
      return;
    }
    if (sessionId === undefined) {
      setError('No se indicó la sesión.');
      return;
    }

    return subscribeSessionPanel(
      runtime.firestore,
      sessionId,
      setData,
      (caught) => setError(caught.message),
    );
  }, [sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined || !['RESULTADO_FINAL', 'FINALIZADA'].includes(data?.stage ?? '')) return;
    loadSessionSnapshotRemote(runtime.firestore, sessionId)
      .then(setExportSnapshot)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'No se preparó la exportación.'));
  }, [data?.stage, sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }

    return subscribeReviewData(
      runtime.firestore,
      sessionId,
      setReview,
      (caught) => setError(caught.message),
    );
  }, [sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }

    return subscribeRefinementControl(
      runtime.firestore,
      sessionId,
      setRefinement,
      (caught) => setError(caught.message),
    );
  }, [sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }

    return subscribeResults(
      runtime.firestore,
      sessionId,
      setResults,
      (caught) => setError(caught.message),
    );
  }, [sessionId]);

  function publishResults() {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    publishResultsRemote({
      firestore: runtime.firestore,
      sessionId,
      actorId: runtime.auth.currentUser?.uid ?? 'facilitator',
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(
        caught instanceof Error
          ? caught.message
          : 'Error al publicar el resultado.',
      ),
    );
  }

  function changeStage(action: StageAction) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) return;
    changeStageRemote({
      firestore: runtime.firestore,
      sessionId,
      action,
      actorId: runtime.auth.currentUser?.uid ?? 'facilitator',
      now: new Date().toISOString(),
      auditId: crypto.randomUUID(),
    }).catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : 'Error al cambiar de etapa.'),
    );
  }

  function finalize() {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    finalizeRemoteSession(
      runtime.firestore,
      sessionId,
      new Date().toISOString(),
    ).catch((caught: unknown) =>
      setError(
        caught instanceof Error
          ? caught.message
          : 'Error al finalizar la sesión.',
      ),
    );
  }

  function reopen() {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    reopenRemoteSession(
      runtime.firestore,
      sessionId,
      new Date().toISOString(),
    ).catch((caught: unknown) =>
      setError(
        caught instanceof Error
          ? caught.message
          : 'Error al reabrir la sesión.',
      ),
    );
  }

  function correct(initiativeId: string, text: string) {
    const runtime = getFirebaseRuntime();
    const initiative = review.initiatives.find(
      (item) => item.id === initiativeId,
    );
    if (runtime === null || sessionId === undefined || initiative === undefined) {
      return;
    }
    correctInitiativeRemote({
      firestore: runtime.firestore,
      sessionId,
      initiativeId,
      text,
      revision: initiative.revision,
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : 'Error al corregir.'),
    );
  }

  function requestClarification(initiativeId: string, message: string) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    requestClarificationRemote({
      firestore: runtime.firestore,
      sessionId,
      clarificationId: crypto.randomUUID(),
      initiativeId,
      message,
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(
        caught instanceof Error ? caught.message : 'Error al solicitar.',
      ),
    );
  }

  function openRefinement(finalistCount: number) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    const activeIds = review.initiatives
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => item.id);
    const now = new Date().toISOString();
    const action =
      finalistCount === activeIds.length
        ? skipRefinementRemote({
            firestore: runtime.firestore,
            sessionId,
            initiativeIds: activeIds,
            now,
          })
        : openRefinementRemote({
            firestore: runtime.firestore,
            sessionId,
            finalistCount,
            now,
          });
    action.catch((caught: unknown) =>
      setError(
        caught instanceof Error ? caught.message : 'Error al abrir depuración.',
      ),
    );
  }

  function resolveRefinement(continueIncomplete: boolean) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    const activeIds = review.initiatives
      .filter((item) => item.status === 'ACTIVE')
      .map((item) => item.id);
    const completeBallots = new Set(
      refinement.ballots
        .filter((ballot) => ballot.round === 'REFINEMENT')
        .map((ballot) => ballot.participantId),
    ).size;
    const now = new Date().toISOString();

    resolveRefinementRemote({
      firestore: runtime.firestore,
      sessionId,
      initiativeIds: activeIds,
      ballots: refinement.ballots,
      finalistCount: refinement.finalistCount ?? activeIds.length,
      now,
    })
      .then(async () => {
        if (
          continueIncomplete &&
          completeBallots < refinement.expectedParticipants
        ) {
          await continueWithIncompleteRemote({
            firestore: runtime.firestore,
            sessionId,
            actorId: runtime.auth.currentUser?.uid ?? 'facilitator',
            auditId: crypto.randomUUID(),
            completeBallots,
            expectedParticipants: refinement.expectedParticipants,
            now,
          });
        }
      })
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : 'Error al cerrar depuración.',
        ),
      );
  }

  function decideTie(selectedIds: readonly string[]) {
    const runtime = getFirebaseRuntime();
    if (
      runtime === null ||
      sessionId === undefined ||
      refinement.tieBreak === null
    ) {
      return;
    }
    decideTieRemote({
      firestore: runtime.firestore,
      sessionId,
      tie: refinement.tieBreak,
      aboveIds: refinement.finalistIds,
      selectedIds,
      actorId: runtime.auth.currentUser?.uid ?? 'facilitator',
      auditId: crypto.randomUUID(),
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(
        caught instanceof Error ? caught.message : 'Error al desempatar.',
      ),
    );
  }

  function saveIce(
    method: 'MULTIPLICATIVE' | 'WEIGHTED',
    weights: { impact: number; confidence: number; ease: number } | null,
  ) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    saveIceConfigRemote({
      firestore: runtime.firestore,
      sessionId,
      method,
      weights,
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : 'Error al guardar.'),
    );
  }

  function startIce(
    method: 'MULTIPLICATIVE' | 'WEIGHTED',
    weights: { impact: number; confidence: number; ease: number } | null,
  ) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined || data === null) {
      return;
    }
    startIceEvaluationRemote({
      firestore: runtime.firestore,
      sessionId,
      method,
      weights,
      stage: data.stage,
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(
        caught instanceof Error ? caught.message : 'Error al iniciar ICE.',
      ),
    );
  }

  function fuse(
    targetId: string,
    sourceIds: readonly string[],
    mergedText: string,
  ) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    fuseInitiativesRemote({
      firestore: runtime.firestore,
      sessionId,
      targetId,
      sourceIds,
      mergedText,
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : 'Error al fusionar.'),
    );
  }

  const participantLink =
    data === null
      ? ''
      : `${window.location.origin}${window.location.pathname}#/participar/${data.publicCode}`;

  return (
    <PlaceholderPage title="Panel del facilitador">
      {error === null ? null : <Alert severity="error">{error}</Alert>}
      {data === null ? (
        <Typography aria-live="polite">Cargando sesión…</Typography>
      ) : (
        <>
          <FacilitatorPanel
            data={data}
            participantLink={participantLink}
            {...(state?.facilitatorToken === undefined
              ? {}
              : { facilitatorToken: state.facilitatorToken })}
            {...(state?.participantCredentials === undefined
              ? {}
              : { participantCredentials: state.participantCredentials })}
          />
          <SessionStageControls stage={data.stage} onChange={changeStage} />
          {data.stage === 'REVISION' ? (
            <ReviewPanel
              initiatives={review.initiatives}
              clarifications={review.clarifications}
              onCorrect={correct}
              onRequestClarification={requestClarification}
              onFuse={fuse}
            />
          ) : null}
          {[
            'REVISION',
            'DEPURACION',
            'DESEMPATE_DEPURACION',
            'CONFIGURACION_ICE',
          ].includes(data.stage) ? (
            <RefinementControl
              stage={data.stage}
              initiativeTexts={Object.fromEntries(
                review.initiatives.map((item) => [item.id, item.text]),
              )}
              availableCount={
                review.initiatives.filter((item) => item.status === 'ACTIVE')
                  .length
              }
              finalistCount={refinement.finalistCount}
              finalistIds={refinement.finalistIds}
              tie={refinement.tieBreak}
              expectedParticipants={refinement.expectedParticipants}
              completeBallots={
                new Set(
                  refinement.ballots
                    .filter((ballot) => ballot.round === 'REFINEMENT')
                    .map((ballot) => ballot.participantId),
                ).size
              }
              onOpen={openRefinement}
              onResolve={resolveRefinement}
              onDecide={decideTie}
            />
          ) : null}
          {['CONFIGURACION_ICE', 'EVALUACION_ICE'].includes(data.stage) ? (
            <IceConfigForm
              initialConfig={refinement.iceConfig}
              locked={data.stage === 'EVALUACION_ICE'}
              onSave={saveIce}
              onStart={startIce}
            />
          ) : null}
          {['EVALUACION_ICE', 'RESULTADO_FINAL', 'FINALIZADA'].includes(
            data.stage,
          ) ? (
            <ResultsPanel
              stage={data.stage}
              ranking={results.ranking}
              initiativeTexts={Object.fromEntries(
                review.initiatives.map((item) => [item.id, item.text]),
              )}
              authors={results.authors}
              expiresAt={results.expiresAt}
              onPublish={publishResults}
              onFinalize={finalize}
              onReopen={reopen}
            />
          ) : null}
          {exportSnapshot === null ? null : (
            <>
              <BackupExportButton snapshot={exportSnapshot} />
              <SharedReportButton snapshot={exportSnapshot} />
            </>
          )}
        </>
      )}
    </PlaceholderPage>
  );
}

