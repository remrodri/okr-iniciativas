import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";

import { FacilitatorPanel } from "@/features/facilitator/FacilitatorPanel";
import { SessionStageControls } from "@/features/facilitator/SessionStageControls";
import { BackupExportButton } from "@/features/excel/BackupExportButton";
import { SharedReportButton } from "@/features/excel/SharedReportButton";
import type { SessionSnapshot } from "@/domain/ports";
import { IceConfigForm } from "@/features/ice/IceConfigForm";
import { RefinementControl } from "@/features/refinement/RefinementControl";
import { ResultsPanel } from "@/features/results/ResultsPanel";
import { ReviewPanel } from "@/features/review/ReviewPanel";
import { getFirebaseRuntime } from "@/infrastructure/firebase/runtime";
import { changeStageRemote } from "@/infrastructure/firebase/stageRemote";
import { loadSessionSnapshotRemote } from "@/infrastructure/firebase/snapshotRemote";
import type { StageAction } from "@/domain/stateMachine";
import {
  saveIceConfigRemote,
  startIceEvaluationRemote,
} from "@/infrastructure/firebase/iceConfigRemote";
import {
  continueWithIncompleteRemote,
  decideTieRemote,
  openRefinementRemote,
  resolveRefinementRemote,
  skipRefinementRemote,
  subscribeRefinementControl,
  type RefinementControlData,
} from "@/infrastructure/firebase/refinementControl";
import {
  correctInitiativeRemote,
  fuseInitiativesRemote,
  requestClarificationRemote,
  subscribeReviewData,
  type ReviewData,
} from "@/infrastructure/firebase/reviewActions";
import {
  subscribeSessionPanel,
  type SessionPanelData,
} from "@/infrastructure/firebase/sessionPanel";
import {
  publishResultsRemote,
  subscribeResults,
  type ResultsData,
} from "@/infrastructure/firebase/resultsRemote";
import {
  finalizeRemoteSession,
  reopenRemoteSession,
} from "@/infrastructure/firebase/sessionLifecycle";
import { PlaceholderPage } from "./PlaceholderPage";
import {
  readableFirebaseError,
  useFirebaseAuthReady,
} from "@/features/connectivity/useFirebaseAuthReady";
import { useOnlineStatus } from "@/features/participant/useOnlineStatus";
import { startFacilitatorPresence } from "@/infrastructure/firebase/presence";
import Box from "@mui/material/Box";
import {
  FacilitatorNavigation,
  type FacilitatorSection,
} from "@/features/facilitator/FacilitatorNavigation";
import { Divider } from "@mui/material";

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
  const [section, setSection] = useState<FacilitatorSection>("ACCESS");

  const [refinement, setRefinement] = useState<RefinementControlData>({
    ballots: [],
    finalistCount: null,
    finalistIds: [],
    tieBreak: null,
    expectedParticipants: 0,
    iceConfig: null,
    stage: "",
  });
  const [results, setResults] = useState<ResultsData>({
    stage: "CONFIGURACION",
    expiresAt: null,
    ranking: [],
    authors: [],
  });
  const [error, setError] = useState<string | null>(null);
  const [exportSnapshot, setExportSnapshot] = useState<SessionSnapshot | null>(
    null,
  );
  const online = useOnlineStatus();
  const authReady = useFirebaseAuthReady();

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined || !authReady || !online)
      return;
    return startFacilitatorPresence({
      firestore: runtime.firestore,
      sessionId,
      onError: (caught) => setError(readableFirebaseError(caught)),
    });
  }, [authReady, online, sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null) {
      setError("Firebase no está configurado en este entorno.");
      return;
    }
    if (sessionId === undefined) {
      setError("No se indicó la sesión.");
      return;
    }

    if (!authReady) return;
    return subscribeSessionPanel(
      runtime.firestore,
      sessionId,
      setData,
      (caught) => setError(readableFirebaseError(caught)),
    );
  }, [authReady, sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (
      runtime === null ||
      sessionId === undefined ||
      !["RESULTADO_FINAL", "FINALIZADA"].includes(data?.stage ?? "")
    )
      return;
    loadSessionSnapshotRemote(runtime.firestore, sessionId)
      .then(setExportSnapshot)
      .catch((caught: unknown) =>
        setError(
          caught instanceof Error
            ? caught.message
            : "No se preparó la exportación.",
        ),
      );
  }, [data?.stage, sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined || !authReady) {
      return;
    }

    return subscribeReviewData(
      runtime.firestore,
      sessionId,
      setReview,
      (caught) => setError(readableFirebaseError(caught)),
    );
  }, [authReady, sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined || !authReady) {
      return;
    }

    return subscribeRefinementControl(
      runtime.firestore,
      sessionId,
      setRefinement,
      (caught) => setError(readableFirebaseError(caught)),
    );
  }, [authReady, sessionId]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined || !authReady) {
      return;
    }

    return subscribeResults(
      runtime.firestore,
      sessionId,
      setResults,
      (caught) => setError(readableFirebaseError(caught)),
    );
  }, [authReady, sessionId]);

  function publishResults() {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    publishResultsRemote({
      firestore: runtime.firestore,
      sessionId,
      actorId: runtime.auth.currentUser?.uid ?? "facilitator",
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(
        caught instanceof Error
          ? caught.message
          : "Error al publicar el resultado.",
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
      actorId: runtime.auth.currentUser?.uid ?? "facilitator",
      now: new Date().toISOString(),
      auditId: crypto.randomUUID(),
    }).catch((caught: unknown) =>
      setError(
        caught instanceof Error ? caught.message : "Error al cambiar de etapa.",
      ),
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
          : "Error al finalizar la sesión.",
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
          : "Error al reabrir la sesión.",
      ),
    );
  }

  function correct(initiativeId: string, text: string) {
    const runtime = getFirebaseRuntime();
    const initiative = review.initiatives.find(
      (item) => item.id === initiativeId,
    );
    if (
      runtime === null ||
      sessionId === undefined ||
      initiative === undefined
    ) {
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
      setError(caught instanceof Error ? caught.message : "Error al corregir."),
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
        caught instanceof Error ? caught.message : "Error al solicitar.",
      ),
    );
  }

  function openRefinement(finalistCount: number) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    const activeIds = review.initiatives
      .filter((item) => item.status === "ACTIVE")
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
        caught instanceof Error ? caught.message : "Error al abrir depuración.",
      ),
    );
  }

  function resolveRefinement(continueIncomplete: boolean) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || sessionId === undefined) {
      return;
    }
    const activeIds = review.initiatives
      .filter((item) => item.status === "ACTIVE")
      .map((item) => item.id);
    const completeBallots = new Set(
      refinement.ballots
        .filter((ballot) => ballot.round === "REFINEMENT")
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
            actorId: runtime.auth.currentUser?.uid ?? "facilitator",
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
            : "Error al cerrar depuración.",
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
      actorId: runtime.auth.currentUser?.uid ?? "facilitator",
      auditId: crypto.randomUUID(),
      now: new Date().toISOString(),
    }).catch((caught: unknown) =>
      setError(
        caught instanceof Error ? caught.message : "Error al desempatar.",
      ),
    );
  }

  function saveIce(
    method: "MULTIPLICATIVE" | "WEIGHTED",
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
      setError(caught instanceof Error ? caught.message : "Error al guardar."),
    );
  }

  function startIce(
    method: "MULTIPLICATIVE" | "WEIGHTED",
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
        caught instanceof Error ? caught.message : "Error al iniciar ICE.",
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
      setError(caught instanceof Error ? caught.message : "Error al fusionar."),
    );
  }

  const participantLink =
    data === null
      ? ""
      : `${window.location.origin}${window.location.pathname}#/participar/${data.publicCode}`;

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        // background: "rgba(0, 0, 0, 0.48)",
        borderRadius: "12px",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(0, 0, 0, 0.4)",
        color: "white",
      }}
    >
      <PlaceholderPage title="Panel del facilitador">
        {!online ? (
          <Alert severity="warning" aria-live="assertive">
            Sin conexión. El panel no recibirá actualizaciones y las acciones de
            control permanecerán bloqueadas hasta reconectar.
          </Alert>
        ) : null}
        {error === null ? null : <Alert severity="error">{error}</Alert>}
        {data === null ? (
          <Typography aria-live="polite" sx={{ color: "white" }}>
            Cargando sesión…
          </Typography>
        ) : (
          <fieldset
            disabled={!online}
            style={{
              flexGrow: 1,
              border: 0,
              margin: 0,
              minWidth: 0,
              padding: 0,
              width: "100%",
              // background: "rgba(0, 0, 255, 0.48)",
              display: "flex",
            }}
          >
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: "flex-start",
                gap: 2,
                width: "100%",
                // background: "rgba(255, 0, 0, 0.48)",
              }}
            >
              <FacilitatorNavigation
                selected={section}
                onSelect={setSection}
                hasPersonalAccess={state?.participantCredentials !== undefined}
                hasRecovery={state?.facilitatorToken !== undefined}
              />
              <Box sx={{ flex: 1, minWidth: 0, width: "100%" }}>
                {section !== "STAGE" ? (
                  <FacilitatorPanel
                    section={section}
                    data={data}
                    participantLink={participantLink}
                    {...(state?.facilitatorToken === undefined
                      ? {}
                      : { facilitatorToken: state.facilitatorToken })}
                    {...(state?.participantCredentials === undefined
                      ? {}
                      : {
                          participantCredentials: state.participantCredentials,
                        })}
                  />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      // gap: 2,
                      height: { md: "36.5rem", lg: "36.4rem", xl: "49.9rem" },
                      borderRadius: "12px",
                      overflowY: "auto",
                      boxShadow: "0 4px 30px rgb(0, 0, 0)",
                      // background: "rgba(250, 250, 250, 0.71)",
                          // border: "1px solid rgba(250, 250, 250,1)",
                      p:2
                    }}
                  >
                    <SessionStageControls
                      stage={data.stage}
                      onChange={changeStage}
                    />
                    {data.stage === "REVISION" ? (
                      <ReviewPanel
                        initiatives={review.initiatives}
                        clarifications={review.clarifications}
                        onCorrect={correct}
                        onRequestClarification={requestClarification}
                        onFuse={fuse}
                      />
                    ) : null}
                    {[
                      "REVISION",
                      "DEPURACION",
                      "DESEMPATE_DEPURACION",
                      "CONFIGURACION_ICE",
                    ].includes(data.stage) ? (
                      <Box
                        sx={{
                        }}
                      >
                        <RefinementControl
                          stage={data.stage}
                          initiativeTexts={Object.fromEntries(
                            review.initiatives.map((item) => [
                              item.id,
                              item.text,
                            ]),
                          )}
                          availableCount={
                            review.initiatives.filter(
                              (item) => item.status === "ACTIVE",
                            ).length
                          }
                          finalistCount={refinement.finalistCount}
                          finalistIds={refinement.finalistIds}
                          tie={refinement.tieBreak}
                          expectedParticipants={refinement.expectedParticipants}
                          completeBallots={
                            new Set(
                              refinement.ballots
                                .filter(
                                  (ballot) => ballot.round === "REFINEMENT",
                                )
                                .map((ballot) => ballot.participantId),
                            ).size
                          }
                          onOpen={openRefinement}
                          onResolve={resolveRefinement}
                          onDecide={decideTie}
                        />
                      </Box>
                    ) : null}
                    {["CONFIGURACION_ICE", "EVALUACION_ICE"].includes(
                      data.stage,
                    ) ? (
                      <Box sx={{  mt:2}}>
                        <IceConfigForm
                          initialConfig={refinement.iceConfig}
                          locked={data.stage === "EVALUACION_ICE"}
                          onSave={saveIce}
                          onStart={startIce}
                        />
                      </Box>
                    ) : null}
                    {[
                      "EVALUACION_ICE",
                      "RESULTADO_FINAL",
                      "FINALIZADA",
                    ].includes(data.stage) ? (
                      <Box
                        sx={{
                          // pt: 2,
                          // pl: 2,
                          // pr: 2,
                          // pb: 2,
                        }}
                      >
                        <ResultsPanel
                          stage={data.stage}
                          ranking={results.ranking}
                          initiativeTexts={Object.fromEntries(
                            review.initiatives.map((item) => [
                              item.id,
                              item.text,
                            ]),
                          )}
                          authors={results.authors}
                          expiresAt={results.expiresAt}
                          onPublish={publishResults}
                          onFinalize={finalize}
                          onReopen={reopen}
                        />
                      </Box>
                    ) : null}
                    {exportSnapshot === null ? null : (
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1,
                          borderRadius: "12px",
                          // overflowY: "auto",
                          background: "rgb(255, 250, 250)",
                          border: "1px solid rgba(250, 250, 250,1)",
                              padding: 2,
                          mt:2
                        }}
                      >
                        <Box
                          sx={{
                            flexGrow: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          <Typography
                            component="h2"
                            variant="h2"
                            sx={{ color: "black" }}
                          >
                            Respaldos
                          </Typography>
                          <Typography variant="body1" sx={{ color: "black" }}>
                            El respaldo del facilitador conserva toda la
                            información necesaria para recuperar el proceso,
                            mientras que el archivo para participantes permite
                            compartir los resultados sin revelar votos ni
                            calificaciones individuales.
                          </Typography>
                          <Divider />
                          <Box sx={{ flexGrow: 1, display: "flex", gap: 2 }}>
                            <BackupExportButton snapshot={exportSnapshot} />
                            <SharedReportButton snapshot={exportSnapshot} />
                          </Box>
                        </Box>
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          </fieldset>
        )}
      </PlaceholderPage>
    </Box>
  );
}
