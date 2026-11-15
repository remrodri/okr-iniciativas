import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { StageAction } from '@/domain/stateMachine';
import type { SessionStage } from '@/domain/types';

const actions: Partial<Record<SessionStage, { action: StageAction; label: string }>> = {
  CONFIGURACION: { action: 'OPEN_WAITING_ROOM', label: 'Abrir sala de espera' },
  SALA_DE_ESPERA: { action: 'OPEN_BRAINSTORMING', label: 'Abrir brainstorming' },
  BRAINSTORMING: { action: 'CLOSE_BRAINSTORMING', label: 'Cerrar brainstorming y revisar' },
};

export function SessionStageControls({ stage, onChange }: {
  readonly stage: SessionStage;
  readonly onChange: (action: StageAction) => void;
}) {
  const available = actions[stage];
  if (available === undefined) return null;
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1.5}>
        <Typography component="h2" variant="h2">Control de etapa</Typography>
        <Button variant="contained" onClick={() => onChange(available.action)}>
          {available.label}
        </Button>
      </Stack>
    </Paper>
  );
}
