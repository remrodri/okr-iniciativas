import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import {
  HashRouter,
  Link as RouterLink,
  Route,
  Routes,
} from "react-router-dom";

import { APP_NAME } from "./buildInfo";
import { ConsultationPage } from "./pages/ConsultationPage";
import { FacilitatorPage } from "./pages/FacilitatorPage";
import { HomePage } from "./pages/HomePage";
import { NewSessionPage } from "./pages/NewSessionPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { ParticipantEntryPage } from "./pages/ParticipantEntryPage";
import { ParticipantSessionPage } from "./pages/ParticipantSessionPage";
import background from "../../assets/images/background.webp";

export function AppRouter() {
  return (
    <HashRouter>
      <Box
        sx={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          //     backgroundImage: `linear-gradient(
          //   rgba(10, 15, 25, 0.45),
          //   rgba(10, 15, 25, 0.45)
          // ), url(${background})`,
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          justifyContent: "center",
          backgroundAttachment: { xs: "scroll", md: "fixed" },
          padding: "1rem",
          gap: "1rem",
        }}
      >
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{
            background: "rgba(0, 0, 0, 0.48)",
            borderRadius: "12px",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(0, 0, 0, 0.4)",
            color: "white",
          }}
        >
          <Toolbar>
            <Typography
              component={RouterLink}
              to="/"
              variant="subtitle1"
              sx={{ color: "inherit", fontWeight: 700, textDecoration: "none" }}
            >
              {APP_NAME}
            </Typography>
          </Toolbar>
        </AppBar>
        <Box component="main"
          sx={{
          display: "flex",
          flexDirection: "column",
          flexGrow: 1,
            gap: "1rem",
        }}
        >
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/facilitador/nueva" element={<NewSessionPage />} />
            <Route
              path="/facilitador/:sessionId"
              element={<FacilitatorPage />}
            />
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
      </Box>
    </HashRouter>
  );
}
