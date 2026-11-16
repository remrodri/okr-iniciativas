import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import { createIceConfig } from '@/domain/iceConfig';
import type { IceConfig, IceMethod, IceWeights } from '@/domain/types';

export interface IceConfigFormProps {
  readonly initialConfig: IceConfig | null;
  readonly locked: boolean;
  readonly onSave: (method: IceMethod, weights: IceWeights | null) => void;
  readonly onStart: (method: IceMethod, weights: IceWeights | null) => void;
}

export function IceConfigForm({
  initialConfig,
  locked,
  onSave,
  onStart,
}: IceConfigFormProps) {
  const [method, setMethod] = useState<IceMethod>(
    initialConfig?.method ?? 'MULTIPLICATIVE',
  );
  const [impact, setImpact] = useState(
    String((initialConfig?.weights?.impact ?? 0) * 100),
  );
  const [confidence, setConfidence] = useState(
    String((initialConfig?.weights?.confidence ?? 0) * 100),
  );
  const [ease, setEase] = useState(
    String((initialConfig?.weights?.ease ?? 0) * 100),
  );
  const [error, setError] = useState<string | null>(null);

  const weights: IceWeights = {
    impact: Number(impact) / 100,
    confidence: Number(confidence) / 100,
    ease: Number(ease) / 100,
  };
  const total = Number(impact) + Number(confidence) + Number(ease);

  function validate(): { method: IceMethod; weights: IceWeights | null } | null {
    try {
      const config = createIceConfig({
        method,
        weights: method === 'WEIGHTED' ? weights : null,
      });
      setError(null);
      return { method: config.method, weights: config.weights };
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Configuración inválida.',
      );
      return null;
    }
  }

  function save() {
    const config = validate();
    if (config !== null) {
      onSave(config.method, config.weights);
    }
  }

  function start() {
    const config = validate();
    if (config !== null) {
      onStart(config.method, config.weights);
    }
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: "12px",
        // overflowY: "auto",
        background: "rgba(250, 250, 250, 0.71)",
        border: "1px solid rgba(250, 250, 250,1)",
        height: {lg: "25.6rem", xl: "25.7rem" },
      }}
    >
      <Stack spacing={2}>
        <Typography component="h2" variant="h2">
          Configuración ICE
        </Typography>
        {locked ? (
          <Alert severity="info">
            El método ICE está bloqueado porque la evaluación ya comenzó.
          </Alert>
        ) : null}
        <RadioGroup
          value={method}
          onChange={(event) => setMethod(event.target.value as IceMethod)}
        >
          <FormControlLabel
            value="MULTIPLICATIVE"
            control={<Radio disabled={locked} />}
            label="Multiplicativo (Impacto × Confianza × Facilidad)"
          />
          <FormControlLabel
            value="WEIGHTED"
            control={<Radio disabled={locked} />}
            label="Ponderado (pesos sobre 100 %)"
          />
        </RadioGroup>

        {method === "WEIGHTED" ? (
          <Stack spacing={2}>
            <TextField
              label="Peso de Impacto"
              type="number"
              value={impact}
              disabled={locked}
              onChange={(event) => setImpact(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.0001 } }}
            />
            <TextField
              label="Peso de Confianza"
              type="number"
              value={confidence}
              disabled={locked}
              onChange={(event) => setConfidence(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.0001 } }}
            />
            <TextField
              label="Peso de Facilidad"
              type="number"
              value={ease}
              disabled={locked}
              onChange={(event) => setEase(event.target.value)}
              slotProps={{ htmlInput: { min: 0, step: 0.0001 } }}
            />
            <Typography
              color={
                Math.abs(total - 100) < 1e-9 ? "success.main" : "error.main"
              }
            >
              Total: {total} %
            </Typography>
          </Stack>
        ) : null}

        {error === null ? null : <Alert severity="error">{error}</Alert>}

        <Button variant="outlined" disabled={locked} onClick={save}>
          Guardar configuración
        </Button>
        <Button variant="contained" disabled={locked} onClick={start}>
          Iniciar evaluación ICE
        </Button>
      </Stack>
    </Paper>
  );
}
