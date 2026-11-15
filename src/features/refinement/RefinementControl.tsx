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

import { DomainError } from '@/domain/errors';
import type { RefinementTie } from '@/domain/finalists';
import { validateFinalistCount } from '@/domain/refinementPlan';
import type { SessionStage } from '@/domain/types';

export interface RefinementControlProps {
  readonly stage: SessionStage;
  readonly initiativeTexts: Readonly<Record<string, string>>;
  readonly availableCount: number;
  readonly finalistCount: number | null;
  readonly finalistIds: readonly string[];
  readonly tie: RefinementTie | null;
  readonly expectedParticipants: number;
  readonly completeBallots: number;
  readonly onOpen: (finalistCount: number) => void;
  readonly onResolve: (continueIncomplete: boolean) => void;
  readonly onDecide: (selectedIds: readonly string[]) => void;
}

export function RefinementControl({
  stage,
  initiativeTexts,
  availableCount,
  finalistCount,
  finalistIds,
  tie,
  expectedParticipants,
  completeBallots,
  onOpen,
  onResolve,
  onDecide,
}: RefinementControlProps) {
  const [count, setCount] = useState(
    finalistCount === null ? Math.min(1, availableCount) : finalistCount,
  );
  const [countError, setCountError] = useState<string | null>(null);
  const [continueIncomplete, setContinueIncomplete] = useState(false);
  const [selected, setSelected] = useState<readonly string[]>([]);

  const incomplete = completeBallots < expectedParticipants;

  function open() {
    try {
      validateFinalistCount(count, availableCount);
      setCountError(null);
      onOpen(count);
    } catch (caught) {
      setCountError(
        caught instanceof DomainError ? caught.message : 'Cantidad inválida.',
      );
    }
  }

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  if (stage === 'REVISION') {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography component="h2" variant="h2">
            Abrir depuración
          </Typography>
          <Typography color="text.secondary">
            Hay {availableCount} iniciativas disponibles después de la revisión.
          </Typography>
          <TextField
            label="Cantidad de finalistas (N)"
            type="number"
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
            error={countError !== null}
            helperText={countError ?? undefined}
            slotProps={{
              htmlInput: { min: 1, max: Math.min(40, availableCount) },
            }}
          />
          {count === availableCount ? (
            <Alert severity="info">
              N coincide con las disponibles: se omitirá la votación de
              depuración.
            </Alert>
          ) : null}
          <Button variant="contained" onClick={open}>
            Abrir depuración
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (stage === 'DEPURACION') {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography component="h2" variant="h2">
            Depuración en curso
          </Typography>
          <Typography aria-live="polite">
            {completeBallots} de {expectedParticipants} votos completos
          </Typography>
          {incomplete ? (
            <Alert severity="warning">
              Hay participantes sin voto completo. Puedes continuar de forma
              explícita, descartando los envíos parciales.
            </Alert>
          ) : null}
          <FormControlLabel
            control={
              <Checkbox
                checked={continueIncomplete}
                onChange={(event) =>
                  setContinueIncomplete(event.target.checked)
                }
              />
            }
            label="Confirmo continuar con votos incompletos"
          />
          <Button
            variant="contained"
            disabled={incomplete && !continueIncomplete}
            onClick={() => onResolve(incomplete)}
          >
            Cerrar depuración y calcular finalistas
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (stage === 'DESEMPATE_DEPURACION' && tie !== null) {
    return (
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography component="h2" variant="h2">
            Desempate de depuración
          </Typography>
          <Typography>
            Elige exactamente {tie.slotsRemaining} de las iniciativas empatadas.
          </Typography>
          {tie.candidateIds.map((id) => (
            <FormControlLabel
              key={id}
              control={
                <Checkbox
                  checked={selected.includes(id)}
                  onChange={() => toggle(id)}
                />
              }
              label={initiativeTexts[id] ?? id}
            />
          ))}
          <Button
            variant="contained"
            disabled={selected.length !== tie.slotsRemaining}
            onClick={() => onDecide(selected)}
          >
            Confirmar desempate
          </Button>
        </Stack>
      </Paper>
    );
  }

  if (finalistIds.length === 0) {
    return null;
  }

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Stack spacing={1}>
        <Typography component="h2" variant="h2">
          {finalistIds.length} iniciativas finalistas
        </Typography>
        <Box component="ol" sx={{ m: 0, pl: 2 }}>
          {finalistIds.map((id) => (
            <Typography component="li" key={id}>
              {initiativeTexts[id] ?? id}
            </Typography>
          ))}
        </Box>
      </Stack>
    </Paper>
  );
}
