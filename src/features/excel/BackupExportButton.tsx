import { Alert, Box, Button, LinearProgress, Stack, Typography } from '@mui/material';
import { useState } from 'react';

import type { SessionSnapshot } from '@/domain/ports';
import {
  downloadBackupWorkbook,
  exportBackupWorkbook,
} from '@/infrastructure/workbook/backupExport';

type Exporter = (
  snapshot: SessionSnapshot,
  onProgress: (value: number) => void,
) => Promise<Uint8Array>;

interface BackupExportButtonProps {
  readonly snapshot: SessionSnapshot;
  readonly exporter?: Exporter;
  readonly download?: (bytes: Uint8Array, sessionId: string) => void;
}

const defaultExporter: Exporter = (snapshot, onProgress) =>
  exportBackupWorkbook(snapshot, { onProgress });

export function BackupExportButton({
  snapshot,
  exporter = defaultExporter,
  download = downloadBackupWorkbook,
}: BackupExportButtonProps) {
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setProgress(0);
    setMessage(null);
    setError(null);
    try {
      const bytes = await exporter(snapshot, setProgress);
      download(bytes, snapshot.sessionId);
      setMessage('Respaldo descargado.');
    } catch {
      setError('No se pudo generar el respaldo. Inténtalo nuevamente.');
    } finally {
      setProgress(null);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ alignItems: 'flex-start' }}>
      <Button
        variant="contained"
        onClick={() => void handleExport()}
        disabled={progress !== null}
      >
        Exportar respaldo
      </Button>
      {progress !== null && (
        <Box sx={{ width: '100%', maxWidth: 420 }} aria-live="polite">
          <Typography variant="body2">Generando respaldo: {progress} %</Typography>
          <LinearProgress variant="determinate" value={progress} />
        </Box>
      )}
      {message !== null && <Alert severity="success">{message}</Alert>}
      {error !== null && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
