import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useState } from "react";

export interface BallotInitiative {
  readonly id: string;
  readonly text: string;
}

export interface RefinementBallotFormProps {
  readonly initiatives: readonly BallotInitiative[];
  readonly requiredCount: number;
  readonly initialSelection: readonly string[];
  readonly submitted: boolean;
  readonly busy?: boolean;
  readonly error?: string | null;
  readonly title?: string;
  readonly reviewTitle?: string;
  readonly reviewButtonLabel?: string;
  readonly confirmButtonLabel?: string;
  readonly confirmedLabel?: string;
  readonly onSelectionChange: (selection: readonly string[]) => void;
  readonly onSubmit: (selection: readonly string[]) => void;
}

export function RefinementBallotForm({
  initiatives,
  requiredCount,
  initialSelection,
  submitted,
  busy = false,
  error = null,
  title = "Selecciona las iniciativas prioritarias",
  reviewTitle = "Revisa tu voto",
  reviewButtonLabel = "Revisar voto",
  confirmButtonLabel = "Confirmar voto",
  confirmedLabel = "Voto confirmado",
  onSelectionChange,
  onSubmit,
}: RefinementBallotFormProps) {
  const [selection, setSelection] = useState<readonly string[]>(
    initialSelection.filter((id) => initiatives.some((item) => item.id === id)),
  );
  const [reviewing, setReviewing] = useState(false);

  function toggle(id: string) {
    const next = selection.includes(id)
      ? selection.filter((item) => item !== id)
      : selection.length < requiredCount
        ? [...selection, id]
        : selection;
    setSelection(next);
    onSelectionChange(next);
  }

  if (submitted) {
    return (
      <Alert severity="success">
        {confirmedLabel}. Seleccionaste {requiredCount} iniciativas.
      </Alert>
    );
  }

  if (reviewing) {
    const selectedInitiatives = selection
      .map((id) => initiatives.find((item) => item.id === id))
      .filter((item): item is BallotInitiative => item !== undefined);
    return (
      <Stack
        spacing={2}
        sx={{
          borderRadius: "12px",
          // overflowY: "auto",
          background: "rgba(255, 250, 250, 1)",
          border: "1px solid rgba(250, 250, 250,1)",
          padding: 2,
        }}
      >
        <Typography component="h2" variant="h2" sx={{ color: "black" }}>
          {reviewTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ color: "black" }}>
          Después de confirmarlo no podrás cambiar la selección.
        </Typography>
        {selectedInitiatives.map((initiative) => (
          <Paper key={initiative.id} variant="outlined" sx={{ p: 2 }}>
            <Typography sx={{ overflowWrap: "anywhere" }}>
              {initiative.text}
            </Typography>
          </Paper>
        ))}
        {error === null ? null : <Alert severity="error">{error}</Alert>}
        <Button variant="outlined" onClick={() => setReviewing(false)}>
          Volver a seleccionar
        </Button>
        <Button
          variant="contained"
          disabled={busy}
          onClick={() => onSubmit(selection)}
        >
          {busy ? "Enviando…" : confirmButtonLabel}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack
      spacing={2}
      sx={{
        minWidth: 0,
        maxWidth: "100%",
        borderRadius: "12px",
        // overflowY: "auto",
        background: "rgb(255, 250, 250)",
        border: "1px solid rgba(250, 250, 250,1)",
        padding: 2,
        color: "black",
      }}
    >
      <Typography component="h2" variant="h2">
        {title}
      </Typography>
      <Alert severity={selection.length === requiredCount ? "success" : "info"}>
        {selection.length} de {requiredCount} seleccionadas
      </Alert>
      {initiatives.map((initiative) => {
        const checked = selection.includes(initiative.id);
        return (
          <Paper
            key={initiative.id}
            variant="outlined"
            sx={{ p: 1.5, minWidth: 0, overflow: "hidden" }}
          >
            <FormControlLabel
              sx={{ m: 0, width: "100%", alignItems: "flex-start" }}
              control={
                <Checkbox
                  checked={checked}
                  disabled={!checked && selection.length >= requiredCount}
                  onChange={() => toggle(initiative.id)}
                />
              }
              label={
                <Typography sx={{ pt: 1, overflowWrap: "anywhere" }}>
                  {initiative.text}
                </Typography>
              }
            />
          </Paper>
        );
      })}
      {error === null ? null : <Alert severity="error">{error}</Alert>}
      <Button
        variant="contained"
        disabled={selection.length !== requiredCount}
        onClick={() => setReviewing(true)}
      >
        {reviewButtonLabel}
      </Button>
    </Stack>
  );
}
