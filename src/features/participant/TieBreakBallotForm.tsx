import {
  RefinementBallotForm,
  type BallotInitiative,
} from './RefinementBallotForm';

interface TieBreakBallotFormProps {
  readonly initiatives: readonly BallotInitiative[];
  readonly slotsRemaining: number;
  readonly initialSelection: readonly string[];
  readonly submitted: boolean;
  readonly busy?: boolean;
  readonly error?: string | null;
  readonly onSelectionChange: (selection: readonly string[]) => void;
  readonly onSubmit: (selection: readonly string[]) => void;
}

export function TieBreakBallotForm({
  initiatives,
  slotsRemaining,
  initialSelection,
  submitted,
  busy,
  error,
  onSelectionChange,
  onSubmit,
}: TieBreakBallotFormProps) {
  return (
    <RefinementBallotForm
      initiatives={initiatives}
      requiredCount={slotsRemaining}
      initialSelection={initialSelection}
      submitted={submitted}
      {...(busy === undefined ? {} : { busy })}
      {...(error === undefined ? {} : { error })}
      title="Resuelve el desempate"
      reviewTitle="Revisa tu desempate"
      reviewButtonLabel="Revisar desempate"
      confirmButtonLabel="Confirmar desempate"
      confirmedLabel="Desempate confirmado"
      onSelectionChange={onSelectionChange}
      onSubmit={onSubmit}
    />
  );
}
