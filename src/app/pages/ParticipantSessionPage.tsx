import Alert from "@mui/material/Alert";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
  ParticipantAccessForm,
  type ParticipantAccessValues,
} from "@/features/participant/ParticipantAccessForm";
import { InitiativeCapture } from "@/features/participant/InitiativeCapture";
import {
  IceEvaluationStepper,
  type IceDraftRatings,
} from "@/features/participant/IceEvaluationStepper";
import { RefinementBallotForm } from "@/features/participant/RefinementBallotForm";
import {
  ParticipantSyncStatus,
  type ParticipantSyncState,
} from "@/features/participant/ParticipantSyncStatus";
import { TieBreakBallotForm } from "@/features/participant/TieBreakBallotForm";
import { useOnlineStatus } from "@/features/participant/useOnlineStatus";
import {
  createLocalParticipantStore,
  type ParticipantLocalState,
} from "@/infrastructure/browser-storage/localParticipantStore";
import {
  enterParticipantSession,
  type EnteredParticipant,
} from "@/infrastructure/firebase/participantEntry";
import { getFirebaseRuntime } from "@/infrastructure/firebase/runtime";
import {
  submitRefinementBallotRemote,
  submitTieBreakBallotRemote,
} from "@/infrastructure/firebase/participantBallot";
import { submitIceEvaluationRemote } from "@/infrastructure/firebase/participantIce";
import {
  respondToClarificationRemote,
  submitInitiativesRemote,
  subscribeParticipantWorkspace,
  type ParticipantWorkspace,
} from "@/infrastructure/firebase/participantInitiatives";
import { PlaceholderPage } from "./PlaceholderPage";
import {
  useFirebaseAuthReady,
  readableFirebaseError,
} from "@/features/connectivity/useFirebaseAuthReady";
import { startParticipantPresence } from "@/infrastructure/firebase/presence";
import { Box } from "@mui/material";

interface ParticipantLocationState {
  readonly identity?: EnteredParticipant;
}

export function ParticipantSessionPage() {
  const { sessionId: routeValue = "", token: routeToken } = useParams<{
    sessionId: string;
    token?: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const initialToken = useRef(routeToken ?? "");
  const locationState = location.state as ParticipantLocationState | null;
  const [localState, setLocalState] = useState<ParticipantLocalState | null>(
    () => createLocalParticipantStore().load(routeValue),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<ParticipantWorkspace | null>(null);
  const [lastConfirmed, setLastConfirmed] = useState(false);
  const online = useOnlineStatus();
  const authReady = useFirebaseAuthReady();
  const identity = locationState?.identity;
  const activeSessionId = localState?.sessionId;
  const activeParticipantId = localState?.participantId;

  useEffect(() => {
    if (routeToken === undefined) return;
    const cleanUrl = `${window.location.pathname}${window.location.search}#/participar/${routeValue}`;
    window.history.replaceState(null, "", cleanUrl);
  }, [routeToken, routeValue]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (
      runtime === null ||
      activeSessionId === undefined ||
      activeParticipantId === undefined ||
      !authReady
    )
      return;
    return subscribeParticipantWorkspace(
      runtime.firestore,
      activeSessionId,
      activeParticipantId,
      setWorkspace,
      (caught) => setError(readableFirebaseError(caught)),
    );
  }, [activeParticipantId, activeSessionId, authReady]);

  useEffect(() => {
    const runtime = getFirebaseRuntime();
    if (
      runtime === null ||
      !authReady ||
      !online ||
      activeSessionId === undefined ||
      activeParticipantId === undefined
    )
      return;
    return startParticipantPresence({
      firestore: runtime.firestore,
      sessionId: activeSessionId,
      participantId: activeParticipantId,
      onError: (caught) => setError(readableFirebaseError(caught)),
    });
  }, [activeParticipantId, activeSessionId, authReady, online]);

  useEffect(() => {
    setLastConfirmed(false);
    setError(null);
  }, [workspace?.stage]);

  async function enter(values: ParticipantAccessValues) {
    const runtime = getFirebaseRuntime();
    if (runtime === null) {
      setError("Firebase no está configurado en este entorno.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const credential = await runtime.signInAnonymously();
      const entered = await enterParticipantSession({
        firestore: runtime.firestore,
        ...values,
        uid: credential.user.uid,
        now: new Date().toISOString(),
      });
      const stored: ParticipantLocalState = {
        sessionId: entered.sessionId,
        participantId: entered.participantId,
        accessTokenId: entered.accessTokenId,
        alias: entered.alias,
        draft: "",
      };
      createLocalParticipantStore().save(stored);
      setLocalState(stored);
      navigate(`/participar/${entered.sessionId}`, {
        replace: true,
        state: { identity: entered },
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo ingresar.",
      );
    } finally {
      setBusy(false);
    }
  }

  const alias = identity?.alias ?? localState?.alias;
  const hasIdentity = identity !== undefined || localState !== null;

  function draftsFor(count: number): readonly string[] {
    if (localState === null) return Array.from({ length: count }, () => "");
    try {
      const parsed: unknown = JSON.parse(localState.draft);
      if (Array.isArray(parsed)) {
        return Array.from({ length: count }, (_, index) =>
          typeof parsed[index] === "string" ? parsed[index] : "",
        );
      }
    } catch {
      // Los borradores antiguos guardaban una sola cadena.
    }
    return Array.from({ length: count }, (_, index) =>
      index === 0 ? localState.draft : "",
    );
  }

  function saveDraft(drafts: readonly string[]) {
    if (localState === null) return;
    const next = { ...localState, draft: JSON.stringify(drafts) };
    createLocalParticipantStore().save(next);
    setLocalState(next);
    setLastConfirmed(false);
  }

  async function submitInitiatives(drafts: readonly string[]) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || localState === null) return;
    const pendingState: ParticipantLocalState = {
      ...localState,
      draft: JSON.stringify(drafts),
      pending: {
        kind: "BRAINSTORMING",
        submissionId: globalThis.crypto.randomUUID(),
        payload: drafts,
      },
    };
    createLocalParticipantStore().save(pendingState);
    setLocalState(pendingState);
    setLastConfirmed(false);
    if (!online) {
      setError("Sin conexión. El borrador quedó guardado para reintentar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitInitiativesRemote({
        firestore: runtime.firestore,
        sessionId: localState.sessionId,
        participantId: localState.participantId,
        texts: drafts,
        now: new Date().toISOString(),
      });
      const confirmed: ParticipantLocalState = {
        sessionId: pendingState.sessionId,
        participantId: pendingState.participantId,
        accessTokenId: pendingState.accessTokenId,
        ...(pendingState.alias === undefined
          ? {}
          : { alias: pendingState.alias }),
        draft: pendingState.draft,
      };
      createLocalParticipantStore().save(confirmed);
      setLocalState(confirmed);
      setWorkspace((current) =>
        current === null ? current : { ...current, submitted: true },
      );
      setLastConfirmed(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "No se pudo enviar.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(clarificationId: string, responseText: string) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || localState === null) return;
    setBusy(true);
    setError(null);
    try {
      await respondToClarificationRemote({
        firestore: runtime.firestore,
        sessionId: localState.sessionId,
        clarificationId,
        responseText,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo enviar la respuesta.",
      );
    } finally {
      setBusy(false);
    }
  }

  function pendingRefinementSelection(): readonly string[] {
    if (localState?.pending?.kind !== "REFINEMENT") return [];
    return Array.isArray(localState.pending.payload)
      ? localState.pending.payload.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
  }

  function saveRefinementSelection(selection: readonly string[]) {
    if (localState === null) return;
    const existing = localState.pending;
    const next: ParticipantLocalState = {
      ...localState,
      pending: {
        kind: "REFINEMENT",
        submissionId:
          existing?.kind === "REFINEMENT"
            ? existing.submissionId
            : globalThis.crypto.randomUUID(),
        payload: selection,
      },
    };
    createLocalParticipantStore().save(next);
    setLocalState(next);
    setLastConfirmed(false);
  }

  async function submitRefinement(selection: readonly string[]) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || localState === null) return;
    const existing = localState.pending;
    const submissionId =
      existing?.kind === "REFINEMENT"
        ? existing.submissionId
        : globalThis.crypto.randomUUID();
    const pending: ParticipantLocalState = {
      ...localState,
      pending: {
        kind: "REFINEMENT",
        submissionId,
        payload: selection,
      },
    };
    createLocalParticipantStore().save(pending);
    setLocalState(pending);
    setLastConfirmed(false);
    if (!online) {
      setError("Sin conexión. El voto quedó guardado para reintentar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitRefinementBallotRemote({
        firestore: runtime.firestore,
        sessionId: localState.sessionId,
        participantId: localState.participantId,
        selection,
        submissionId,
        now: new Date().toISOString(),
      });
      const confirmed: ParticipantLocalState = {
        sessionId: pending.sessionId,
        participantId: pending.participantId,
        accessTokenId: pending.accessTokenId,
        ...(pending.alias === undefined ? {} : { alias: pending.alias }),
        draft: pending.draft,
      };
      createLocalParticipantStore().save(confirmed);
      setLocalState(confirmed);
      setWorkspace((current) =>
        current === null ? current : { ...current, refinementSubmitted: true },
      );
      setLastConfirmed(true);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo enviar el voto.",
      );
    } finally {
      setBusy(false);
    }
  }

  function pendingTieBreakSelection(): readonly string[] {
    if (localState?.pending?.kind !== "TIEBREAK") return [];
    return Array.isArray(localState.pending.payload)
      ? localState.pending.payload.filter(
          (item): item is string => typeof item === "string",
        )
      : [];
  }

  function saveTieBreakSelection(selection: readonly string[]) {
    if (localState === null) return;
    const existing = localState.pending;
    const next: ParticipantLocalState = {
      ...localState,
      pending: {
        kind: "TIEBREAK",
        submissionId:
          existing?.kind === "TIEBREAK"
            ? existing.submissionId
            : globalThis.crypto.randomUUID(),
        payload: selection,
      },
    };
    createLocalParticipantStore().save(next);
    setLocalState(next);
    setLastConfirmed(false);
  }

  async function submitTieBreak(selection: readonly string[]) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || localState === null) return;
    const existing = localState.pending;
    const submissionId =
      existing?.kind === "TIEBREAK"
        ? existing.submissionId
        : globalThis.crypto.randomUUID();
    const pending: ParticipantLocalState = {
      ...localState,
      pending: {
        kind: "TIEBREAK",
        submissionId,
        payload: selection,
      },
    };
    createLocalParticipantStore().save(pending);
    setLocalState(pending);
    setLastConfirmed(false);
    if (!online) {
      setError("Sin conexión. El desempate quedó guardado para reintentar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitTieBreakBallotRemote({
        firestore: runtime.firestore,
        sessionId: localState.sessionId,
        participantId: localState.participantId,
        selection,
        submissionId,
        now: new Date().toISOString(),
      });
      const confirmed: ParticipantLocalState = {
        sessionId: pending.sessionId,
        participantId: pending.participantId,
        accessTokenId: pending.accessTokenId,
        ...(pending.alias === undefined ? {} : { alias: pending.alias }),
        draft: pending.draft,
      };
      createLocalParticipantStore().save(confirmed);
      setLocalState(confirmed);
      setWorkspace((current) =>
        current === null ? current : { ...current, tieBreakSubmitted: true },
      );
      setLastConfirmed(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo enviar el desempate.",
      );
    } finally {
      setBusy(false);
    }
  }

  function pendingIceRatings(): IceDraftRatings {
    if (
      localState?.pending?.kind !== "ICE" ||
      typeof localState.pending.payload !== "object" ||
      localState.pending.payload === null ||
      Array.isArray(localState.pending.payload)
    ) {
      return {};
    }
    return localState.pending.payload as IceDraftRatings;
  }

  function saveIceRatings(ratings: IceDraftRatings) {
    if (localState === null) return;
    const existing = localState.pending;
    const next: ParticipantLocalState = {
      ...localState,
      pending: {
        kind: "ICE",
        submissionId:
          existing?.kind === "ICE"
            ? existing.submissionId
            : globalThis.crypto.randomUUID(),
        payload: ratings,
      },
    };
    createLocalParticipantStore().save(next);
    setLocalState(next);
    setLastConfirmed(false);
  }

  async function submitIce(
    ratings: Parameters<typeof submitIceEvaluationRemote>[0]["ratings"],
  ) {
    const runtime = getFirebaseRuntime();
    if (runtime === null || localState === null) return;
    const existing = localState.pending;
    const submissionId =
      existing?.kind === "ICE"
        ? existing.submissionId
        : globalThis.crypto.randomUUID();
    const pending: ParticipantLocalState = {
      ...localState,
      pending: {
        kind: "ICE",
        submissionId,
        payload: ratings,
      },
    };
    createLocalParticipantStore().save(pending);
    setLocalState(pending);
    setLastConfirmed(false);
    if (!online) {
      setError("Sin conexión. La evaluación quedó guardada para reintentar.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await submitIceEvaluationRemote({
        firestore: runtime.firestore,
        sessionId: localState.sessionId,
        participantId: localState.participantId,
        ratings,
        submissionId,
        now: new Date().toISOString(),
      });
      const confirmed: ParticipantLocalState = {
        sessionId: pending.sessionId,
        participantId: pending.participantId,
        accessTokenId: pending.accessTokenId,
        ...(pending.alias === undefined ? {} : { alias: pending.alias }),
        draft: pending.draft,
      };
      createLocalParticipantStore().save(confirmed);
      setLocalState(confirmed);
      setWorkspace((current) =>
        current === null ? current : { ...current, iceSubmitted: true },
      );
      setLastConfirmed(true);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo enviar la evaluación ICE.",
      );
    } finally {
      setBusy(false);
    }
  }

  function hasLocalDraft(): boolean {
    if (localState === null) return false;
    if (localState.pending !== undefined) return true;
    try {
      const parsed: unknown = JSON.parse(localState.draft);
      return (
        Array.isArray(parsed) &&
        parsed.some((item) => typeof item === "string" && item.trim() !== "")
      );
    } catch {
      return localState.draft.trim() !== "";
    }
  }

  function currentStageConfirmed(): boolean {
    if (workspace === null) return false;
    if (workspace.stage === "BRAINSTORMING" || workspace.stage === "REVISION") {
      return workspace.submitted;
    }
    if (workspace.stage === "DEPURACION") {
      return workspace.refinementSubmitted;
    }
    if (workspace.stage === "DESEMPATE_DEPURACION") {
      return workspace.tieBreakSubmitted;
    }
    if (workspace.stage === "EVALUACION_ICE") {
      return workspace.iceSubmitted;
    }
    return false;
  }

  function retryPending() {
    const pending = localState?.pending;
    if (pending === undefined) return;
    if (pending.kind === "BRAINSTORMING" && Array.isArray(pending.payload)) {
      void submitInitiatives(
        pending.payload.filter(
          (item): item is string => typeof item === "string",
        ),
      );
    } else if (
      pending.kind === "REFINEMENT" &&
      Array.isArray(pending.payload)
    ) {
      void submitRefinement(
        pending.payload.filter(
          (item): item is string => typeof item === "string",
        ),
      );
    } else if (pending.kind === "TIEBREAK" && Array.isArray(pending.payload)) {
      void submitTieBreak(
        pending.payload.filter(
          (item): item is string => typeof item === "string",
        ),
      );
    } else if (
      pending.kind === "ICE" &&
      typeof pending.payload === "object" &&
      pending.payload !== null &&
      !Array.isArray(pending.payload)
    ) {
      void submitIce(
        pending.payload as Parameters<
          typeof submitIceEvaluationRemote
        >[0]["ratings"],
      );
    }
  }

  const stageLabels: Readonly<Record<string, string>> = {
    CONFIGURACION: "Configuración",
    SALA_DE_ESPERA: "Sala de espera",
    BRAINSTORMING: "Brainstorming",
    REVISION: "Revisión",
    DEPURACION: "Depuración",
    DESEMPATE_DEPURACION: "Desempate",
    CONFIGURACION_ICE: "Configuración ICE",
    EVALUACION_ICE: "Evaluación ICE",
    RESULTADO_FINAL: "Resultado final",
    FINALIZADA: "Finalizada",
  };
  const syncStatus: ParticipantSyncState = busy
    ? "SENDING"
    : error !== null && localState?.pending !== undefined
      ? "ERROR"
      : lastConfirmed || currentStageConfirmed()
        ? "CONFIRMED"
        : "IDLE";
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        padding: "1rem",
        // background: "rgba(0, 0, 0, 0.48)",
        borderRadius: "12px",
        boxShadow: "0 4px 30px rgb(0, 0, 0)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(0, 0, 0, 0.4)",
        color: "white",
        alignItems: "center",
      }}
    >
      <Box
        sx={{
          // flexGrow: 1,
          display: "flex",
          width: "42rem",
          // background: "black",
          p: 2,
          border: "1px solid rgba(0, 0, 0, 0.4)",
          borderRadius: "12px",
          // backdropFilter: "blur(10px)",
          // WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 4px 30px rgb(0, 0, 0)",
        }}
      >
        <PlaceholderPage title="Sesión de participante">
          {hasIdentity ? (
            <Stack spacing={2} sx={{}}>
              <Paper
                variant="outlined"
                sx={{
                  // p: 2,
                  overflowWrap: "anywhere",
                  borderRadius: "12px",
                  overflowY: "auto",
                  // background: "rgba(255, 255, 255, 0.71)",
                  // border: "1px solid rgba(250, 250, 250,1)",
                  // boxShadow: "0 4px 30px rgba(0, 0, 0, 0.6)",
                  // width: "40rem",                display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Stack
                  spacing={1}
                  sx={
                    {
                      // height: { md: "36.5rem", lg: "36.4rem", xl: "49.9rem" },
                      // width: "40rem",
                      p:2
                    }
                  }
                >
                  <Alert severity="success">Acceso confirmado</Alert>
                  <Typography component="h2" variant="h2">
                    {alias === undefined
                      ? "Tu sesión está lista"
                      : `Hola, ${alias}`}
                  </Typography>
                  <Typography color="text.secondary">
                    Tu nombre real permanece privado.
                  </Typography>
                </Stack>
              </Paper>
              <ParticipantSyncStatus
                online={online}
                status={syncStatus}
                hasDraft={hasLocalDraft()}
                stageLabel={
                  workspace === null
                    ? "Conectando"
                    : (stageLabels[workspace.stage] ?? workspace.stage)
                }
                onRetry={retryPending}
              />
              {workspace === null ? (
                <Typography aria-live="polite">Cargando actividad…</Typography>
              ) : workspace.stage === "BRAINSTORMING" ||
                workspace.stage === "REVISION" ? (
                <InitiativeCapture
                  count={workspace.initiativesPerParticipant}
                  initialDrafts={draftsFor(workspace.initiativesPerParticipant)}
                  submitted={workspace.submitted}
                  clarifications={workspace.clarifications}
                  busy={busy}
                  error={error}
                  onDraftChange={saveDraft}
                  onSubmit={submitInitiatives}
                  onRespond={respond}
                />
              ) : workspace.stage === "DEPURACION" &&
                workspace.finalistCount !== null ? (
                <RefinementBallotForm
                  initiatives={workspace.initiatives}
                  requiredCount={workspace.finalistCount}
                  initialSelection={pendingRefinementSelection()}
                  submitted={workspace.refinementSubmitted}
                  busy={busy}
                  error={error}
                  onSelectionChange={saveRefinementSelection}
                  onSubmit={submitRefinement}
                />
              ) : workspace.stage === "DESEMPATE_DEPURACION" &&
                workspace.tieBreak !== null ? (
                <TieBreakBallotForm
                  initiatives={workspace.initiatives.filter((initiative) =>
                    workspace.tieBreak?.candidateIds.includes(initiative.id),
                  )}
                  slotsRemaining={workspace.tieBreak.slotsRemaining}
                  initialSelection={pendingTieBreakSelection()}
                  submitted={workspace.tieBreakSubmitted}
                  busy={busy}
                  error={error}
                  onSelectionChange={saveTieBreakSelection}
                  onSubmit={submitTieBreak}
                />
              ) : workspace.stage === "EVALUACION_ICE" ? (
                <IceEvaluationStepper
                  initiatives={workspace.finalistIds.flatMap((id) => {
                    const initiative = workspace.initiatives.find(
                      (item) => item.id === id,
                    );
                    return initiative === undefined ? [] : [initiative];
                  })}
                  initialRatings={pendingIceRatings()}
                  submitted={workspace.iceSubmitted}
                  busy={busy}
                  error={error}
                  onRatingsChange={saveIceRatings}
                  onSubmit={submitIce}
                />
              ) : (
                <Alert severity="info">
                  Espera las indicaciones del facilitador para continuar.
                </Alert>
              )}
            </Stack>
          ) : (
            <ParticipantAccessForm
              initialPublicCode={routeValue}
              initialToken={initialToken.current}
              busy={busy}
              error={error}
              onSubmit={enter}
            />
          )}
        </PlaceholderPage>
      </Box>
    </Box>
  );
}
