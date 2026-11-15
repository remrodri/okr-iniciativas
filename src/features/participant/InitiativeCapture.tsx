import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { LIMITS } from '@/domain/limits';
import type { ClarificationRequest } from '@/domain/types';

interface InitiativeCaptureProps {
  readonly count: number;
  readonly initialDrafts: readonly string[];
  readonly submitted: boolean;
  readonly clarifications: readonly ClarificationRequest[];
  readonly busy?: boolean;
  readonly error?: string | null;
  readonly onDraftChange: (drafts: readonly string[]) => void;
  readonly onSubmit: (drafts: readonly string[]) => void;
  readonly onRespond: (clarificationId: string, response: string) => void;
}

export function InitiativeCapture({
  count,
  initialDrafts,
  submitted,
  clarifications,
  busy = false,
  error = null,
  onDraftChange,
  onSubmit,
  onRespond,
}: InitiativeCaptureProps) {
  const [drafts, setDrafts] = useState(() =>
    Array.from({ length: count }, (_, index) => initialDrafts[index] ?? ''),
  );
  const [reviewing, setReviewing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});

  function updateDraft(index: number, value: string) {
    const next = drafts.map((draft, current) =>
      current === index ? value : draft,
    );
    setDrafts(next);
    onDraftChange(next);
  }

  function review() {
    if (drafts.length !== count || drafts.some((draft) => draft.trim() === '')) {
      setValidationError(`Completa las ${count} iniciativas.`);
      return;
    }
    setValidationError(null);
    setReviewing(true);
  }

  if (submitted) {
    return (
      <Stack spacing={2}>
        <Alert severity="success">Envío confirmado</Alert>
        <Typography>
          Tus {count} iniciativas fueron recibidas. Ya no puedes modificarlas.
        </Typography>
        {clarifications.length === 0 ? null : (
          <Typography component="h2" variant="h2">
            Aclaraciones solicitadas
          </Typography>
        )}
        {clarifications.map((clarification) => (
          <Paper key={clarification.id} variant="outlined" sx={{ p: 2 }}>
            <Stack spacing={1.5}>
              <Typography>{clarification.message}</Typography>
              {clarification.status === 'RESOLVED' ? (
                <Alert severity="success">
                  Respuesta enviada: {clarification.responseText}
                </Alert>
              ) : (
                <>
                  <TextField
                    label="Respuesta a la aclaración"
                    value={responses[clarification.id] ?? ''}
                    onChange={(event) =>
                      setResponses((current) => ({
                        ...current,
                        [clarification.id]: event.target.value,
                      }))
                    }
                    slotProps={{
                      htmlInput: { maxLength: LIMITS.initiativeTextMax },
                    }}
                    multiline
                    fullWidth
                  />
                  <Button
                    variant="contained"
                    disabled={
                      busy ||
                      (responses[clarification.id] ?? '').trim().length === 0
                    }
                    onClick={() =>
                      onRespond(
                        clarification.id,
                        (responses[clarification.id] ?? '').trim(),
                      )
                    }
                  >
                    Enviar respuesta
                  </Button>
                </>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
    );
  }

  if (reviewing) {
    return (
      <Stack spacing={2}>
        <Typography component="h2" variant="h2">
          Revisión antes de enviar
        </Typography>
        <Typography color="text.secondary">
          Confirma que las {count} iniciativas expresen claramente tus ideas.
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 3 }}>
          {drafts.map((draft, index) => (
            <Typography component="li" key={index} sx={{ mb: 1 }}>
              {draft.trim()}
            </Typography>
          ))}
        </Box>
        {error === null ? null : <Alert severity="error">{error}</Alert>}
        <Button variant="outlined" onClick={() => setReviewing(false)}>
          Volver a editar
        </Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => onSubmit(drafts.map((draft) => draft.trim()))}
        >
          {busy ? 'Enviando…' : 'Confirmar envío'}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography>
        Redacta exactamente {count} {count === 1 ? 'iniciativa' : 'iniciativas'}.
        El borrador se guarda automáticamente en este dispositivo.
      </Typography>
      {drafts.map((draft, index) => (
        <TextField
          key={index}
          label={`Iniciativa ${index + 1}`}
          value={draft}
          onChange={(event) => updateDraft(index, event.target.value)}
          helperText={`${draft.length}/${LIMITS.initiativeTextMax}`}
          slotProps={{
            htmlInput: { maxLength: LIMITS.initiativeTextMax },
          }}
          multiline
          minRows={2}
          fullWidth
        />
      ))}
      {validationError === null ? null : (
        <Alert severity="warning">{validationError}</Alert>
      )}
      {error === null ? null : <Alert severity="error">{error}</Alert>}
      <Button variant="contained" onClick={review}>
        Revisar iniciativas
      </Button>
    </Stack>
  );
}
