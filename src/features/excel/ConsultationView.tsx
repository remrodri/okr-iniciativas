import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { SessionSnapshot } from '@/domain/ports';

interface ConsultationViewProps {
  readonly snapshot: SessionSnapshot;
  readonly onReactivate: () => void;
  readonly reactivating?: boolean;
}

export function ConsultationView({
  snapshot,
  onReactivate,
  reactivating = false,
}: ConsultationViewProps) {
  const { state } = snapshot;
  const iceSubmitted = state.participants.filter(
    (participant) => participant.progress.iceSubmitted,
  ).length;

  return (
    <Stack spacing={2}>
      <Alert severity="info">
        Modo consulta: este respaldo es de solo lectura y no puede modificarse.
      </Alert>
      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        sx={{ flexWrap: 'wrap' }}
      >
        <Chip label={`Etapa: ${state.session.stage}`} />
        <Chip label={`${state.participants.length} participantes`} />
        <Chip label={`${state.initiatives.length} iniciativas`} />
      </Stack>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1}>
            <Typography component="h2" variant="h6">Situación actual (X0)</Typography>
            <Typography>{state.session.x0}</Typography>
            <Typography component="h2" variant="h6">Situación deseada (Xf)</Typography>
            <Typography>{state.session.xf}</Typography>
          </Stack>
        </CardContent>
      </Card>
      <Typography>
        {iceSubmitted} de {state.participants.length} evaluaciones ICE enviadas
      </Typography>
      <Stack spacing={1}>
        <Typography component="h2" variant="h6">Iniciativas</Typography>
        {state.initiatives.map((initiative) => (
          <Card key={initiative.id} variant="outlined">
            <CardContent>
              <Typography>{initiative.text}</Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <Button
        variant="contained"
        onClick={onReactivate}
        disabled={reactivating}
      >
        {reactivating ? 'Reactivando…' : 'Reactivar como nueva sesión'}
      </Button>
    </Stack>
  );
}
