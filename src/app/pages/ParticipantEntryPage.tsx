import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  ParticipantAccessForm,
  type ParticipantAccessValues,
} from "@/features/participant/ParticipantAccessForm";
import { createLocalParticipantStore } from "@/infrastructure/browser-storage/localParticipantStore";
import { enterParticipantSession } from "@/infrastructure/firebase/participantEntry";
import { getFirebaseRuntime } from "@/infrastructure/firebase/runtime";
import { PlaceholderPage } from "./PlaceholderPage";
import { Box } from "@mui/material";

export function ParticipantEntryPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const identity = await enterParticipantSession({
        firestore: runtime.firestore,
        ...values,
        uid: credential.user.uid,
        now: new Date().toISOString(),
      });
      createLocalParticipantStore().save({
        sessionId: identity.sessionId,
        participantId: identity.participantId,
        accessTokenId: identity.accessTokenId,
        alias: identity.alias,
        draft: "",
      });
      navigate(`/participar/${identity.sessionId}`, {
        replace: true,
        state: { identity },
      });
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo ingresar.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        // flexDirection: "column",
        padding: "1rem",
        background: "rgba(0, 0, 0, 0.48)",
        borderRadius: "12px",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(0, 0, 0, 0.4)",
        color: "white",
      }}
    >
      <PlaceholderPage title="Acceso de participante">
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
        }}
        >
          <ParticipantAccessForm busy={busy} error={error} onSubmit={enter} />
        </Box>
      </PlaceholderPage>
    </Box>
  );
}
