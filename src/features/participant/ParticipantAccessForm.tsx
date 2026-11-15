import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useState, type FormEvent } from 'react';

import { normalizePublicCode } from '@/infrastructure/firebase/participantEntry';

export interface ParticipantAccessValues {
  readonly publicCode: string;
  readonly token: string;
  readonly realName: string;
}

interface ParticipantAccessFormProps {
  readonly initialPublicCode?: string;
  readonly initialToken?: string;
  readonly busy?: boolean;
  readonly error?: string | null;
  readonly onSubmit: (values: ParticipantAccessValues) => void;
}

export function ParticipantAccessForm({
  initialPublicCode = '',
  initialToken = '',
  busy = false,
  error = null,
  onSubmit,
}: ParticipantAccessFormProps) {
  const [publicCode, setPublicCode] = useState(
    normalizePublicCode(initialPublicCode),
  );
  const [token, setToken] = useState(initialToken);
  const [realName, setRealName] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    const normalizedCode = normalizePublicCode(publicCode);
    const normalizedToken = token.trim();
    const normalizedName = realName.trim();
    if (
      normalizedCode.length === 0 ||
      normalizedToken.length === 0 ||
      normalizedName.length === 0
    ) {
      return;
    }
    onSubmit({
      publicCode: normalizedCode,
      token: normalizedToken,
      realName: normalizedName,
    });
  }

  return (
    <Stack component="form" spacing={2} onSubmit={submit} noValidate>
      <Typography color="text.secondary">
        Tu nombre se mantendrá privado hasta que se publique el resultado final.
      </Typography>
      {error === null ? null : <Alert severity="error">{error}</Alert>}
      <TextField
        label="Código de sesión"
        value={publicCode}
        onChange={(event) => setPublicCode(event.target.value)}
        error={submitted && publicCode.trim().length === 0}
        helperText={
          submitted && publicCode.trim().length === 0
            ? 'Este campo es obligatorio.'
            : 'Está en el enlace o QR público.'
        }
        autoComplete="off"
        slotProps={{ htmlInput: { maxLength: 12 } }}
        fullWidth
      />
      <TextField
        label="Clave personal"
        type="password"
        value={token}
        onChange={(event) => setToken(event.target.value)}
        error={submitted && token.trim().length === 0}
        helperText={
          submitted && token.trim().length === 0
            ? 'Este campo es obligatorio.'
            : 'Usa la clave o el QR asignado a tu alias.'
        }
        autoComplete="one-time-code"
        fullWidth
      />
      <TextField
        label="Tu nombre real"
        value={realName}
        onChange={(event) => setRealName(event.target.value)}
        error={submitted && realName.trim().length === 0}
        helperText={
          submitted && realName.trim().length === 0
            ? 'Este campo es obligatorio.'
            : 'Sólo se revelará al terminar la priorización.'
        }
        autoComplete="name"
        fullWidth
      />
      <Button type="submit" variant="contained" disabled={busy} fullWidth>
        {busy ? 'Ingresando…' : 'Ingresar'}
      </Button>
    </Stack>
  );
}
