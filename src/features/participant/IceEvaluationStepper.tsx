import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { LIMITS } from '@/domain/limits';
import type { IceScores } from '@/domain/types';
import type { BallotInitiative } from './RefinementBallotForm';

export interface IceDraftScores {
  readonly impact: number | null;
  readonly confidence: number | null;
  readonly ease: number | null;
}

export type IceDraftRatings = Readonly<Record<string, IceDraftScores>>;

interface IceEvaluationStepperProps {
  readonly initiatives: readonly BallotInitiative[];
  readonly initialRatings: IceDraftRatings;
  readonly submitted: boolean;
  readonly busy?: boolean;
  readonly error?: string | null;
  readonly onRatingsChange: (ratings: IceDraftRatings) => void;
  readonly onSubmit: (ratings: Readonly<Record<string, IceScores>>) => void;
}

function valid(value: number | null): value is number {
  return (
    value !== null &&
    Number.isInteger(value) &&
    value >= LIMITS.iceScoreMin &&
    value <= LIMITS.iceScoreMax
  );
}

function complete(scores: IceDraftScores | undefined): scores is IceScores {
  return (
    scores !== undefined &&
    valid(scores.impact) &&
    valid(scores.confidence) &&
    valid(scores.ease)
  );
}

export function IceEvaluationStepper({
  initiatives,
  initialRatings,
  submitted,
  busy = false,
  error = null,
  onRatingsChange,
  onSubmit,
}: IceEvaluationStepperProps) {
  const [ratings, setRatings] = useState<IceDraftRatings>(initialRatings);
  const [index, setIndex] = useState(0);
  const [reviewing, setReviewing] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (submitted) {
    return <Alert severity="success">Evaluación ICE confirmada.</Alert>;
  }

  const current = initiatives[index];
  if (current === undefined) {
    return <Alert severity="warning">No hay iniciativas finalistas.</Alert>;
  }

  function update(field: keyof IceDraftScores, raw: string) {
    if (current === undefined) return;
    const numeric = raw === '' ? null : Number(raw);
    const next = {
      ...ratings,
      [current.id]: {
        impact: ratings[current.id]?.impact ?? null,
        confidence: ratings[current.id]?.confidence ?? null,
        ease: ratings[current.id]?.ease ?? null,
        [field]: numeric,
      },
    };
    setRatings(next);
    onRatingsChange(next);
  }

  function advance() {
    const active = initiatives[index];
    if (active === undefined || !complete(ratings[active.id])) {
      setValidationError('Completa Impacto, Confianza y Facilidad.');
      return;
    }
    setValidationError(null);
    if (index === initiatives.length - 1) {
      setReviewing(true);
    } else {
      setIndex((value) => value + 1);
    }
  }

  function confirm() {
    const completeRatings: Record<string, IceScores> = {};
    for (const initiative of initiatives) {
      const scores = ratings[initiative.id];
      if (!complete(scores)) {
        setReviewing(false);
        setIndex(initiatives.indexOf(initiative));
        setValidationError('Completa Impacto, Confianza y Facilidad.');
        return;
      }
      completeRatings[initiative.id] = scores;
    }
    onSubmit(completeRatings);
  }

  if (reviewing) {
    const evaluated = initiatives.filter((initiative) =>
      complete(ratings[initiative.id]),
    ).length;
    return (
      <Stack spacing={2}>
        <Typography component="h2" variant="h2">
          Resumen de evaluación ICE
        </Typography>
        <Alert severity="success">
          {evaluated} de {initiatives.length} evaluadas
        </Alert>
        {initiatives.map((initiative) => {
          const scores = ratings[initiative.id];
          return (
            <Paper key={initiative.id} variant="outlined" sx={{ p: 2 }}>
              <Typography sx={{ fontWeight: 600, overflowWrap: 'anywhere' }}>
                {initiative.text}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Impacto {scores?.impact} · Confianza {scores?.confidence} ·
                Facilidad {scores?.ease}
              </Typography>
            </Paper>
          );
        })}
        {error === null ? null : <Alert severity="error">{error}</Alert>}
        <Button variant="outlined" onClick={() => setReviewing(false)}>
          Volver a revisar
        </Button>
        <Button variant="contained" disabled={busy} onClick={confirm}>
          {busy ? 'Enviando…' : 'Confirmar evaluación'}
        </Button>
      </Stack>
    );
  }

  const currentScores = ratings[current.id];
  const inputProps = {
    min: LIMITS.iceScoreMin,
    max: LIMITS.iceScoreMax,
    step: 1,
    inputMode: 'numeric' as const,
  };

  return (
    <Stack spacing={2} sx={{ minWidth: 0, maxWidth: '100%' }}>
      <Typography component="h2" variant="h2">
        Evaluación ICE
      </Typography>
      <Typography color="text.secondary">
        Iniciativa {index + 1} de {initiatives.length}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={((index + 1) / initiatives.length) * 100}
        aria-label="Progreso de evaluación"
      />
      <Paper variant="outlined" sx={{ p: 2, overflowWrap: 'anywhere' }}>
        <Typography>{current.text}</Typography>
      </Paper>
      <TextField
        label="Impacto"
        type="number"
        value={currentScores?.impact ?? ''}
        onChange={(event) => update('impact', event.target.value)}
        slotProps={{ htmlInput: inputProps }}
        helperText="1 = impacto bajo · 10 = impacto alto"
        fullWidth
      />
      <TextField
        label="Confianza"
        type="number"
        value={currentScores?.confidence ?? ''}
        onChange={(event) => update('confidence', event.target.value)}
        slotProps={{ htmlInput: inputProps }}
        helperText="1 = poca confianza · 10 = mucha confianza"
        fullWidth
      />
      <TextField
        label="Facilidad"
        type="number"
        value={currentScores?.ease ?? ''}
        onChange={(event) => update('ease', event.target.value)}
        slotProps={{ htmlInput: inputProps }}
        helperText="1 = difícil · 10 = fácil"
        fullWidth
      />
      {validationError === null ? null : (
        <Alert severity="warning">{validationError}</Alert>
      )}
      {error === null ? null : <Alert severity="error">{error}</Alert>}
      <Stack direction="row" spacing={1}>
        <Button
          variant="outlined"
          disabled={index === 0}
          onClick={() => setIndex((value) => value - 1)}
          fullWidth
        >
          Anterior
        </Button>
        <Button variant="contained" onClick={advance} fullWidth>
          {index === initiatives.length - 1
            ? 'Revisar evaluación'
            : 'Siguiente'}
        </Button>
      </Stack>
    </Stack>
  );
}
