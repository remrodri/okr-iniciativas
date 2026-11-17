import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { StageAction } from "@/domain/stateMachine";
import type { SessionStage } from "@/domain/types";
import { Box, Divider } from "@mui/material";

const actions: Partial<
  Record<SessionStage, { action: StageAction; label: string }>
> = {
  CONFIGURACION: { action: "OPEN_WAITING_ROOM", label: "ABRIR SALA DE ESPERA" },
  SALA_DE_ESPERA: {
    action: "OPEN_BRAINSTORMING",
    label: "Abrir brainstorming",
  },
  BRAINSTORMING: {
    action: "CLOSE_BRAINSTORMING",
    label: "Cerrar brainstorming y revisar",
  },
};

export function SessionStageControls({
  stage,
  onChange,
}: {
  readonly stage: SessionStage;
  readonly onChange: (action: StageAction) => void;
}) {
  const available = actions[stage];
  if (available === undefined) return null;
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: { md: "36.5rem", lg: "36.4rem", xl: "49.9rem" },
        borderRadius: "12px",
        overflowY: "auto",
        background: "rgb(255, 250, 250)",
        border: "1px solid rgb(255, 255, 255)",
        // boxShadow: "0 4px 30px rgb(0, 0, 0)",
      }}
    >
      <Stack spacing={1.5}>
        <Typography component="h2" variant="h2">
          Control de etapa
        </Typography>
        <Typography>
          Abre cada etapa cuando el equipo esté listo. Antes de avanzar,
          verifica el progreso de los participantes, ya que los envíos de la
          etapa anterior quedarán cerrados.
        </Typography>
        <Divider />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: { lg: "23.4rem", xl: "38.7rem" },
            justifyContent: "center",
          }}
        >
          <Button
            variant="contained"
            onClick={() => onChange(available.action)}
          >
            {available.label}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
