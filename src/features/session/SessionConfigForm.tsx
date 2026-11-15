import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';

import { DomainError } from '@/domain/errors';
import { LIMITS } from '@/domain/limits';
import {
  validateSessionConfig,
  type SessionConfig,
} from '@/domain/sessionConfig';

export interface SessionConfigFormProps {
  readonly onSubmit: (config: SessionConfig) => void;
}

interface FormState {
  readonly x0: string;
  readonly xf: string;
  readonly expectedParticipants: string;
  readonly initiativesPerParticipant: string;
}

const INITIAL_STATE: FormState = {
  x0: '',
  xf: '',
  expectedParticipants: '1',
  initiativesPerParticipant: '1',
};

function toPositiveInteger(value: string): number {
  return Number.parseInt(value, 10);
}

export function SessionConfigForm({ onSubmit }: SessionConfigFormProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [error, setError] = useState<DomainError | null>(null);

  const participants = toPositiveInteger(form.expectedParticipants);
  const initiatives = toPositiveInteger(form.initiativesPerParticipant);
  const total =
    Number.isFinite(participants) && Number.isFinite(initiatives)
      ? participants * initiatives
      : null;

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const config = validateSessionConfig({
        x0: form.x0,
        xf: form.xf,
        expectedParticipants: participants,
        initiativesPerParticipant: initiatives,
      });
      setError(null);
      onSubmit(config);
    } catch (caught) {
      if (caught instanceof DomainError) {
        setError(caught);
        return;
      }
      throw caught;
    }
  }

  return (
    <Stack
      component="form"
      spacing={2}
      onSubmit={handleSubmit}
      noValidate
      sx={{ width: '100%' }}
    >
      <TextField
        label="X0"
        value={form.x0}
        onChange={(event) => update('x0', event.target.value)}
        helperText={`${form.x0.length} / ${LIMITS.scenarioTextMax}`}
        error={error?.field === 'x0'}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Xf"
        value={form.xf}
        onChange={(event) => update('xf', event.target.value)}
        helperText={`${form.xf.length} / ${LIMITS.scenarioTextMax}`}
        error={error?.field === 'xf'}
        multiline
        minRows={2}
        fullWidth
      />
      <TextField
        label="Participantes esperados"
        type="number"
        value={form.expectedParticipants}
        onChange={(event) =>
          update('expectedParticipants', event.target.value)
        }
        error={error?.field === 'expectedParticipants'}
        slotProps={{
          htmlInput: { min: 1, max: LIMITS.participantsMax, step: 1 },
        }}
        fullWidth
      />
      <TextField
        label="Iniciativas por participante"
        type="number"
        value={form.initiativesPerParticipant}
        onChange={(event) =>
          update('initiativesPerParticipant', event.target.value)
        }
        error={error?.field === 'initiativesPerParticipant'}
        slotProps={{
          htmlInput: {
            min: LIMITS.initiativesPerParticipantMin,
            max: LIMITS.initiativesPerParticipantMax,
            step: 1,
          },
        }}
        fullWidth
      />
      <Typography aria-live="polite">
        {total === null
          ? 'Iniciativas totales: —'
          : `Iniciativas totales: ${total}`}
      </Typography>
      {error === null ? null : <Alert severity="error">{error.message}</Alert>}
      <Button type="submit" variant="contained">
        Crear sesión
      </Button>
    </Stack>
  );
}
