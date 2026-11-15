import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import type {
  ClarificationRequest,
  Initiative,
} from '@/domain/types';

export interface ReviewPanelProps {
  readonly initiatives: readonly Initiative[];
  readonly clarifications: readonly ClarificationRequest[];
  readonly onCorrect: (initiativeId: string, text: string) => void;
  readonly onRequestClarification: (
    initiativeId: string,
    message: string,
  ) => void;
  readonly onFuse: (
    targetId: string,
    sourceIds: readonly string[],
    mergedText: string,
  ) => void;
}

export function ReviewPanel({
  initiatives,
  clarifications,
  onCorrect,
  onRequestClarification,
  onFuse,
}: ReviewPanelProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<readonly string[]>([]);
  const [mergedText, setMergedText] = useState('');

  const active = initiatives.filter(
    (initiative) => initiative.status === 'ACTIVE',
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function fuse() {
    const [targetId, ...sourceIds] = selected;
    if (targetId === undefined || sourceIds.length === 0) {
      return;
    }
    onFuse(targetId, sourceIds, mergedText);
    setSelected([]);
    setMergedText('');
  }

  return (
    <Stack spacing={3}>
      <Alert severity="info">
        Revisión ciega: la autoría permanece oculta durante la revisión.
      </Alert>

      {active.map((initiative) => {
        const requests = clarifications.filter(
          (request) => request.initiativeId === initiative.id,
        );
        const linkedTexts = initiatives
          .filter(
            (item) =>
              item.status === 'FUSED' && item.mergedIntoId === initiative.id,
          )
          .map((item) => item.text);
        const originalTexts = [
          ...new Set([
            ...initiative.originals.map((original) => original.text),
            ...linkedTexts,
          ]),
        ];

        return (
          <Paper key={initiative.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Revisión {initiative.revision}
                </Typography>
                <Typography sx={{ wordBreak: 'break-word' }}>
                  {initiative.text}
                </Typography>
              </Box>

              {originalTexts.length === 0 ? null : (
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Versiones originales conservadas
                  </Typography>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {originalTexts.map((text) => (
                      <Typography component="li" key={text}>
                        {text}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}

              <FormControlLabel
                control={
                  <Checkbox
                    checked={selected.includes(initiative.id)}
                    onChange={() => toggle(initiative.id)}
                  />
                }
                label="Incluir en fusión"
              />

              <TextField
                label="Corrección de ortografía o puntuación"
                value={drafts[initiative.id] ?? ''}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [initiative.id]: event.target.value,
                  }))
                }
                multiline
              />
              <Button
                variant="outlined"
                onClick={() =>
                  onCorrect(initiative.id, drafts[initiative.id] ?? '')
                }
              >
                Guardar corrección
              </Button>

              <TextField
                label="Solicitud anónima de aclaración"
                value={messages[initiative.id] ?? ''}
                onChange={(event) =>
                  setMessages((current) => ({
                    ...current,
                    [initiative.id]: event.target.value,
                  }))
                }
                multiline
              />
              <Button
                variant="outlined"
                onClick={() =>
                  onRequestClarification(
                    initiative.id,
                    messages[initiative.id] ?? '',
                  )
                }
              >
                Solicitar aclaración
              </Button>

              {requests.map((request) => (
                <Box key={request.id}>
                  <Typography variant="body2" color="text.secondary">
                    Aclaración {request.status === 'OPEN' ? 'pendiente' : 'resuelta'}
                  </Typography>
                  <Typography>{request.message}</Typography>
                  {request.responseText === null ? null : (
                    <Typography color="text.secondary">
                      {request.responseText}
                    </Typography>
                  )}
                </Box>
              ))}
            </Stack>
          </Paper>
        );
      })}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography component="h2" variant="h2">
            Fusión de propuestas similares
          </Typography>
          <Typography color="text.secondary">
            La primera propuesta seleccionada será la principal y conservará
            todas las versiones originales.
          </Typography>
          <TextField
            label="Texto consolidado"
            value={mergedText}
            onChange={(event) => setMergedText(event.target.value)}
            multiline
          />
          <Button
            variant="contained"
            disabled={selected.length < 2}
            onClick={fuse}
          >
            Fusionar seleccionadas
          </Button>
        </Stack>
      </Paper>
    </Stack>
  );
}
