import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { SessionSnapshot } from '@/domain/ports';
import { ConsultationView } from '@/features/excel/ConsultationView';
import {
  type ReactivatedBackup,
} from '@/features/excel/reactivateBackup';
import { saveSnapshotWithLimit } from '@/features/session/sessionLimit';
import { IndexedDbSessionRepository } from '@/infrastructure/browser-storage/indexedDbSessionRepository';
import { reactivateBackupRemote } from '@/infrastructure/firebase/backupReactivation';
import { claimFacilitatorAccess } from '@/infrastructure/firebase/facilitatorAccess';
import { getFirebaseRuntime } from '@/infrastructure/firebase/runtime';
import { PlaceholderPage } from './PlaceholderPage';

export function ConsultationPage() {
  const { localId } = useParams<{ localId: string }>();
  const navigate = useNavigate();
  const repository = useMemo(() => new IndexedDbSessionRepository(), []);
  const [snapshot, setSnapshot] = useState<SessionSnapshot | null>(null);
  const [credentials, setCredentials] = useState<ReactivatedBackup | null>(null);
  const [loading, setLoading] = useState(true);
  const [reactivating, setReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (localId === undefined) {
      setError('No se indicó el respaldo local.');
      setLoading(false);
      return;
    }
    repository
      .get(localId)
      .then((found) => {
        setSnapshot(found);
        if (found === null) setError('No se encontró el respaldo importado.');
      })
      .catch(() => setError('No se pudo leer el respaldo local.'))
      .finally(() => setLoading(false));
  }, [localId, repository]);

  const handleReactivate = async () => {
    if (snapshot === null) return;
    setReactivating(true);
    setError(null);
    try {
      const runtime = getFirebaseRuntime();
      if (runtime === null) {
        throw new Error('Firebase no está configurado en este entorno.');
      }
      const signedIn = await runtime.signInAnonymously();
      const now = new Date().toISOString();
      const result = await reactivateBackupRemote({
        firestore: runtime.firestore,
        creatorUid: signedIn.user.uid,
        source: snapshot,
        now,
      });
      await claimFacilitatorAccess({
        firestore: runtime.firestore,
        token: result.facilitatorToken,
        uid: signedIn.user.uid,
        now,
      });
      await saveSnapshotWithLimit(repository, result.snapshot);
      setCredentials(result);
      navigate(`/facilitador/${result.snapshot.sessionId}`, {
        state: {
          facilitatorToken: result.facilitatorToken,
          publicCode: result.publicCode,
          participantCredentials: result.participants.map(
            ({ participantId, alias, token }) => ({ participantId, alias, token }),
          ),
        },
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo reactivar.');
    } finally {
      setReactivating(false);
    }
  };

  return (
    <PlaceholderPage title="Consulta de respaldo">
      {loading && <CircularProgress aria-label="Cargando respaldo" />}
      {error !== null && <Alert severity="error">{error}</Alert>}
      {snapshot !== null && (
        <ConsultationView
          snapshot={snapshot}
          onReactivate={() => void handleReactivate()}
          reactivating={reactivating}
        />
      )}
      {credentials !== null && (
        <Card variant="outlined">
          <CardContent>
            <Stack spacing={1}>
              <Alert severity="success">
                Nueva sesión local creada con credenciales diferentes.
              </Alert>
              <Typography>Código público: {credentials.publicCode}</Typography>
              <Typography sx={{ overflowWrap: 'anywhere' }}>
                Clave del facilitador: {credentials.facilitatorToken}
              </Typography>
              {credentials.participants.map((participant) => (
                <Typography key={participant.participantId} sx={{ overflowWrap: 'anywhere' }}>
                  {participant.alias}: {participant.token}
                </Typography>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </PlaceholderPage>
  );
}
