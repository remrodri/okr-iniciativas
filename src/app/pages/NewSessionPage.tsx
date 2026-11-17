import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { SessionConfig } from "@/domain/sessionConfig";
import { claimFacilitatorAccess } from "@/infrastructure/firebase/facilitatorAccess";
import { getFirebaseRuntime } from "@/infrastructure/firebase/runtime";
import { provisionSession } from "@/infrastructure/firebase/sessionProvisioning";
import { SessionConfigForm } from "@/features/session/SessionConfigForm";
import { PlaceholderPage } from "./PlaceholderPage";
import { Box } from "@mui/material";

export function NewSessionPage() {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createSession(config: SessionConfig) {
    const runtime = getFirebaseRuntime();
    if (runtime === null) {
      setError("Firebase no está configurado en este entorno.");
      return;
    }

    setCreating(true);
    setError(null);
    try {
      const credential = await runtime.signInAnonymously();
      const now = new Date().toISOString();
      const provisioned = await provisionSession({
        firestore: runtime.firestore,
        creatorUid: credential.user.uid,
        config,
        now,
      });
      await claimFacilitatorAccess({
        firestore: runtime.firestore,
        token: provisioned.facilitatorToken,
        uid: credential.user.uid,
        now,
      });
      navigate(`/facilitador/${provisioned.sessionId}`, {
        state: {
          facilitatorToken: provisioned.facilitatorToken,
          publicCode: provisioned.publicCode,
          participantCredentials: provisioned.participants.map(
            ({ participantId, alias, token }) => ({
              participantId,
              alias,
              token,
            }),
          ),
        },
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "No se pudo crear la sesión.",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        // padding: "1rem",
        // gap: "1rem",
        // background: "rgba(0, 0, 0, 0.48)",
        borderRadius: "10px",
        boxShadow: "0 4px 30px rgb(0, 0, 0)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(0, 0, 0, 0.4)",
      }}
    >
      <Box
        sx={{
          background: "rgb(250, 250, 250)",
          borderRadius: "10px",
          boxShadow: "0 4px 30px rgb(0, 0, 0)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(217, 217, 217, 0.4)",
          padding: "1rem",
        }}
      >
        <PlaceholderPage title="Nueva sesión">
          <Typography >
            Define el escenario y la cantidad de iniciativas antes de abrir la
            sala.
          </Typography>
          {error === null ? null : <Alert severity="error">{error}</Alert>}
          {creating ? (
            <Typography aria-live="polite">Creando sesión…</Typography>
          ) : null}
          <SessionConfigForm onSubmit={createSession} />
        </PlaceholderPage>
      </Box>
    </Box>
  );
}
