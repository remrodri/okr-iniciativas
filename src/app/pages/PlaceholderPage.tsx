import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { ReactNode } from 'react';

interface PlaceholderPageProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function PlaceholderPage({ title, children }: PlaceholderPageProps) {
  return (
    <Container maxWidth="sm" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography component="h1" variant="h1">
          {title}
        </Typography>
        {children}
      </Stack>
    </Container>
  );
}
