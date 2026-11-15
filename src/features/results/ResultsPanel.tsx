import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { RankingEntry, SessionStage } from '@/domain/types';

export interface ResultAuthor {
  readonly initiativeId: string;
  readonly names: readonly string[];
}

export interface ResultsPanelProps {
  readonly stage: SessionStage;
  readonly ranking: readonly RankingEntry[];
  readonly initiativeTexts: Readonly<Record<string, string>>;
  readonly authors: readonly ResultAuthor[];
  readonly expiresAt: string | null;
  readonly onPublish: () => void;
  readonly onFinalize: () => void;
  readonly onReopen: () => void;
}

function formatNumber(value: number): string {
  return value.toFixed(2).replace('.', ',');
}

function formatExpiration(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function ResultsPanel({
  stage,
  ranking,
  initiativeTexts,
  authors,
  expiresAt,
  onPublish,
  onFinalize,
  onReopen,
}: ResultsPanelProps) {
  const revealed = stage === 'RESULTADO_FINAL' || stage === 'FINALIZADA';
  const positionCounts = new Map<number, number>();
  for (const entry of ranking) {
    positionCounts.set(
      entry.position,
      (positionCounts.get(entry.position) ?? 0) + 1,
    );
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography component="h2" variant="h2">
          {stage === 'FINALIZADA' ? 'Sesión finalizada' : 'Resultado final'}
        </Typography>

        {ranking.length === 0 ? (
          <Typography color="text.secondary">
            Aún no hay ranking publicado.
          </Typography>
        ) : (
          <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            <Stack spacing={2}>
              {ranking.map((entry) => {
                const tied = (positionCounts.get(entry.position) ?? 0) > 1;
                const entryAuthors = authors.find(
                  (item) => item.initiativeId === entry.initiativeId,
                );
                return (
                  <Box component="li" key={entry.initiativeId}>
                    <Stack spacing={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                      >
                        <Typography component="span" sx={{ fontWeight: 600 }}>
                          Puesto {entry.position}
                        </Typography>
                        {tied ? <Chip size="small" label="Empate" /> : null}
                        <Typography component="span">
                          {initiativeTexts[entry.initiativeId] ??
                            entry.initiativeId}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Impacto {formatNumber(entry.impactMedian)} · Confianza{' '}
                        {formatNumber(entry.confidenceMedian)} · Facilidad{' '}
                        {formatNumber(entry.easeMedian)}
                      </Typography>
                      <Typography>
                        Puntuación {formatNumber(entry.score)}
                      </Typography>
                      {revealed &&
                      entryAuthors !== undefined &&
                      entryAuthors.names.length > 0 ? (
                        <Typography variant="body2">
                          Autoría: {entryAuthors.names.join(', ')}
                        </Typography>
                      ) : null}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          </Box>
        )}

        {stage === 'EVALUACION_ICE' ? (
          <Button variant="contained" onClick={onPublish}>
            Publicar resultado final
          </Button>
        ) : null}

        {stage === 'RESULTADO_FINAL' ? (
          <Button variant="contained" onClick={onFinalize}>
            Finalizar sesión
          </Button>
        ) : null}

        {stage === 'FINALIZADA' ? (
          <Stack spacing={1}>
            <Typography>
              Periodo de recuperación de 24 horas. Puedes reabrir la sesión
              antes del vencimiento.
            </Typography>
            {expiresAt === null ? null : (
              <Typography aria-live="polite">
                Vence: {formatExpiration(expiresAt)}
              </Typography>
            )}
            <Button variant="outlined" onClick={onReopen}>
              Reabrir sesión
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
