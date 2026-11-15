import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export type ParticipantSyncState =
  | 'IDLE'
  | 'SENDING'
  | 'CONFIRMED'
  | 'ERROR';

interface ParticipantSyncStatusProps {
  readonly online: boolean;
  readonly status: ParticipantSyncState;
  readonly hasDraft: boolean;
  readonly stageLabel: string;
  readonly onRetry: () => void;
}

export function ParticipantSyncStatus({
  online,
  status,
  hasDraft,
  stageLabel,
  onRetry,
}: ParticipantSyncStatusProps) {
  return (
    <Stack spacing={1} aria-live="polite">
      <Typography variant="body2" color="text.secondary">
        Etapa actual: {stageLabel}
      </Typography>
      {!online ? (
        <Alert severity="warning">
          Sin conexión. Tu borrador permanece guardado en este dispositivo.
        </Alert>
      ) : status === 'SENDING' ? (
        <Alert severity="info">Enviando a Firebase…</Alert>
      ) : status === 'CONFIRMED' ? (
        <Alert severity="success">Envío confirmado por Firebase.</Alert>
      ) : status === 'ERROR' ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={onRetry}>
              Reintentar envío
            </Button>
          }
        >
          El envío no fue confirmado. El contenido sigue guardado.
        </Alert>
      ) : hasDraft ? (
        <Alert severity="info">
          Borrador guardado localmente; todavía no es un envío confirmado.
        </Alert>
      ) : (
        <Alert severity="info">Conectado. Esperando actividad.</Alert>
      )}
    </Stack>
  );
}
