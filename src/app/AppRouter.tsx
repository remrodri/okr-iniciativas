import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { HashRouter, Link as RouterLink, Route, Routes } from 'react-router-dom';

import { APP_NAME } from './buildInfo';
import { ConsultationPage } from './pages/ConsultationPage';
import { FacilitatorPage } from './pages/FacilitatorPage';
import { HomePage } from './pages/HomePage';
import { NewSessionPage } from './pages/NewSessionPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ParticipantEntryPage } from './pages/ParticipantEntryPage';
import { ParticipantSessionPage } from './pages/ParticipantSessionPage';

export function AppRouter() {
  return (
    <HashRouter>
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography
            component={RouterLink}
            to="/"
            variant="subtitle1"
            sx={{ color: 'inherit', fontWeight: 700, textDecoration: 'none' }}
          >
            {APP_NAME}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/facilitador/nueva" element={<NewSessionPage />} />
          <Route path="/facilitador/:sessionId" element={<FacilitatorPage />} />
          <Route path="/participar" element={<ParticipantEntryPage />} />
          <Route
            path="/participar/:sessionId"
            element={<ParticipantSessionPage />}
          />
          <Route
            path="/participar/:sessionId/:token"
            element={<ParticipantSessionPage />}
          />
          <Route path="/consulta/:localId" element={<ConsultationPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Box>
    </HashRouter>
  );
}
