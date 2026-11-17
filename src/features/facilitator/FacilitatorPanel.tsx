import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { QrCode } from "@/shared/QrCode";
import type { SessionPanelData } from "@/infrastructure/firebase/sessionPanel";
import type { FacilitatorSection } from "./FacilitatorNavigation";

export interface FacilitatorPanelProps {
  readonly section: Exclude<FacilitatorSection, "STAGE">;
  readonly data: SessionPanelData;
  readonly participantLink: string;
  readonly facilitatorToken?: string;
  readonly participantCredentials?: readonly {
    readonly participantId: string;
    readonly alias: string;
    readonly token: string;
  }[];
}

function progressLabel(
  progress: SessionPanelData["participants"][number]["progress"],
): string {
  if (progress.iceSubmitted) {
    return "ICE enviado";
  }
  if (progress.tieBreakSubmitted) {
    return "Desempate enviado";
  }
  if (progress.refinementSubmitted) {
    return "Votación enviada";
  }
  if (progress.brainstormingSubmitted) {
    return "Iniciativas enviadas";
  }
  return "Sin envíos";
}

export function FacilitatorPanel({
  section,
  data,
  participantLink,
  facilitatorToken,
  participantCredentials,
}: FacilitatorPanelProps) {
  return (
    <Stack
      spacing={2}
      sx={{
        // flexGrow: 1,
        // height: "100%",
        // height: { md: "36.5rem", lg: "36.4rem", xl: "49.9rem" },
        overflowY: "auto",
        // background: "rgba(0, 255, 0, 0.48)"
        boxShadow: "0 4px 30px rgb(0, 0, 0)",
        borderRadius: "12px",
        p: 2,
      }}
    >
      {section === "ACCESS" ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            height: { md: "34.4rem", lg: "34.5rem", xl: "49.9rem" },
            borderRadius: "12px",
            overflowY: "auto",
            background: "rgb(255, 250, 250)",
            border: "1px solid rgba(250, 250, 250,1)",
            display: "flex",
            // boxShadow: "0 4px 30px rgb(0, 0, 0)",
          }}
        >
          <Stack spacing={2} sx={{ flexGrow: 1, width: "100%" }}>
            <Typography component="h2" variant="h2">
              Acceso de participantes
            </Typography>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                gap: 4,
              }}
            >
              <Typography variant="h2" component="p" sx={{ letterSpacing: 4 }}>
                {data.publicCode}
              </Typography>
              <Typography sx={{ wordBreak: "break-all" }}>
                {participantLink}
              </Typography>
              <QrCode value={participantLink} label="QR público de la sesión" />
              <Typography color="text.secondary">
                Etapa actual: {data.stage}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      ) : null}

      {section === "PERSONAL_ACCESS" && participantCredentials !== undefined ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            height: { md: "34.4rem", lg: "34.5rem", xl: "49.9rem" },
            overflowY: "auto",
            background: "rgb(255, 250, 250)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 250, 250,1)",
            // boxShadow: "0 4px 30px rgb(0, 0, 0)",
          }}
        >
          <Stack spacing={2}>
            <Typography component="h2" variant="h2">
              Accesos personales
            </Typography>
            <Typography color="text.secondary">
              Entrega a cada persona únicamente el acceso de su alias. Estas
              claves se muestran al crear la sesión.
            </Typography>
            {participantCredentials.map((credential) => {
              const personalLink = `${participantLink}/${credential.token}`;
              return (
                <Box
                  key={credential.participantId}
                  sx={{
                    background: "rgba(121, 121, 121, 0.4)",
                    padding: 2,
                    borderRadius: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {credential.alias}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: "monospace", overflowWrap: "anywhere" }}
                  >
                    {credential.token}
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <QrCode
                      value={personalLink}
                      label={`QR personal de ${credential.alias}`}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Paper>
      ) : null}

      {section === "PARTICIPANTS" ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            height: { md: "34.4rem", lg: "34.5rem", xl: "49.9rem" },
            borderRadius: "12px",
            overflowY: "auto",
            background: "rgb(255, 250, 250)",
            border: "1px solid rgba(255, 250, 250,1)",
          }}
        >
          <Stack spacing={1}>
            <Typography component="h2" variant="h2">
              Participantes
            </Typography>
            <Typography>
              Consulta el estado de conexión y el avance de cada participante.
              Antes de continuar a la siguiente etapa, verifica quiénes
              completaron y enviaron su actividad.
            </Typography>
            <Divider />
            {data.participants.map((participant) => (
              <Box
                key={participant.participantId}
                sx={{
                  display: "flex",
                  // flexWrap: "wrap",
                  // gap: 1,
                  alignItems: "center",
                  // justifyContent: "space-between",
                  // px: 2,
                  // background: "rgba(121, 121, 121, 0.4)",
                  borderRadius: "12px",
                  border: "1px solid rgba(121, 121, 121, 0.4)",
                  py: 1,
                }}
              >
                <Typography
                  sx={{
                    width: "34%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {participant.alias}
                </Typography>
                <Box
                  sx={{
                    width: "33%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <Chip
                    size="small"
                    label={participant.connected ? "Conectado" : "Desconectado"}
                    color={participant.connected ? "success" : "default"}
                  />
                </Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    width: "33%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  {progressLabel(participant.progress)}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {section === "RECOVERY" && facilitatorToken !== undefined ? (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            height: { md: "34.4rem", lg: "34.5rem", xl: "49.9rem" },
            borderRadius: "12px",
            overflowY: "auto",
            background: "rgb(255, 250, 250)",
            border: "1px solid rgba(250, 250, 250,1)",
            display: "flex",
          }}
        >
          <Stack spacing={2}>
            <Typography component="h2" variant="h2">
              Recuperación privada del facilitador
            </Typography>
            <Typography>
              Guarda esta clave en un lugar seguro. No la compartas con los
              participantes.
            </Typography>
            <Divider />
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "2rem",
                // background: "black",
                // height: {
                //   md: "24.5rem",
                //   lg: "24.5rem",
                //   xl:"37.8rem"
                // },
              }}
            >
              <Typography
                sx={{ fontFamily: "monospace", wordBreak: "break-all" }}
              >
                {facilitatorToken}
              </Typography>
              <QrCode
                value={facilitatorToken}
                label="QR privado de recuperación"
              />
            </Box>
          </Stack>
        </Paper>
      ) : null}
    </Stack>
  );
}
