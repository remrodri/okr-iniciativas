import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { QrCode } from '@/shared/QrCode';
import type { SessionPanelData } from '@/infrastructure/firebase/sessionPanel';

export interface FacilitatorPanelProps {
  readonly data: SessionPanelData;
  readonly participantLink: string;
  readonly facilitatorToken?: string;
  readonly participantCredentials?: readonly {
    readonly participantId: string;
    readonly alias: string;
    readonly token: string;
  }[];
}

function progressLabel(progress: SessionPanelData['participants'][number]['progress']): string {
  if (progress.iceSubmitted) {
    return 'ICE enviado';
  }
  if (progress.tieBreakSubmitted) {
    return 'Desempate enviado';
  }
  if (progress.refinementSubmitted) {
    return 'Votación enviada';
  }
  if (progress.brainstormingSubmitted) {
    return 'Iniciativas enviadas';
  }
  return 'Sin envíos';
}

export function FacilitatorPanel({
  data,
  participantLink,
  facilitatorToken,
  participantCredentials,
}: FacilitatorPanelProps) {
  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography component="h2" variant="h2">
            Acceso de participantes
          </Typography>
          <Typography variant="h2" component="p" sx={{ letterSpacing: 4 }}>
            {data.publicCode}
          </Typography>
          <Typography sx={{ wordBreak: 'break-all' }}>
            {participantLink}
          </Typography>
          <QrCode value={participantLink} label="QR público de la sesión" />
          <Typography color="text.secondary">
            Etapa actual: {data.stage}
          </Typography>
        </Stack>
      </Paper>

      {participantCredentials === undefined ? null : (
        <Paper variant="outlined" sx={{ p: 2 }}>
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
                <Box key={credential.participantId}>
                  <Typography sx={{ fontWeight: 600 }}>
                    {credential.alias}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontFamily: 'monospace', overflowWrap: 'anywhere' }}
                  >
                    {credential.token}
                  </Typography>
                  <QrCode
                    value={personalLink}
                    label={`QR personal de ${credential.alias}`}
                  />
                </Box>
              );
            })}
          </Stack>
        </Paper>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1}>
          <Typography component="h2" variant="h2">
            Participantes
          </Typography>
          {data.participants.map((participant) => (
            <Box
              key={participant.participantId}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography>{participant.alias}</Typography>
              <Chip
                size="small"
                label={participant.connected ? 'Conectado' : 'Desconectado'}
                color={participant.connected ? 'success' : 'default'}
              />
              <Typography variant="body2" color="text.secondary">
                {progressLabel(participant.progress)}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>

      {facilitatorToken === undefined ? null : (
        <Paper variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={2}>
            <Typography component="h2" variant="h2">
              Recuperación privada del facilitador
            </Typography>
            <Typography>
              Guarda esta clave en un lugar seguro. No la compartas con los
              participantes.
            </Typography>
            <Divider />
            <Typography sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
              {facilitatorToken}
            </Typography>
            <QrCode
              value={facilitatorToken}
              label="QR privado de recuperación"
            />
          </Stack>
        </Paper>
      )}
    </Stack>
  );
}
