import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink } from 'react-router-dom';

import { PlaceholderPage } from './PlaceholderPage';
import { BackupImportControl } from '@/features/excel/BackupImportControl';

export function HomePage() {
  return (
    <PlaceholderPage title="Inicio">
      <Typography>
        Sesión colaborativa para diseñar y priorizar iniciativas de OKR.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <Button
          component={RouterLink}
          to="/facilitador/nueva"
          variant="contained"
        >
          Crear sesión
        </Button>
        <Button component={RouterLink} to="/participar" variant="outlined">
          Participar
        </Button>
      </Stack>
      <BackupImportControl />
    </PlaceholderPage>
  );
}
