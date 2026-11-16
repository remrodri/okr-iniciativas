import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { StageAction } from "@/domain/stateMachine";
import type { SessionStage } from "@/domain/types";
import { Box } from "@mui/material";

const actions: Partial<
  Record<SessionStage, { action: StageAction; label: string }>
> = {
  CONFIGURACION: { action: "OPEN_WAITING_ROOM", label: "Abrir sala de espera" },
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
        background: "rgba(250, 250, 250, 0.71)",
        border: "1px solid rgba(250, 250, 250,1)",
      }}
    >
      <Stack spacing={1.5}>
        <Typography component="h2" variant="h2">
          Control de etapa
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            height: "25rem",
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
