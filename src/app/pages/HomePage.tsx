import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";

import { PlaceholderPage } from "./PlaceholderPage";
import { BackupImportControl } from "@/features/excel/BackupImportControl";
import Box from "@mui/material/Box";

export function HomePage() {
  return (
    <Box
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        // padding: "1rem",
        // gap: "1rem",
        background: "rgba(0, 0, 0, 0.48)",
        borderRadius: "10px",
        boxShadow: "0 4px 30px rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(0, 0, 0, 0.4)",
      }}
    >
      <Box
        sx={{
          background: "rgba(250, 250, 250, 0.71)",
          borderRadius: "10px",
          boxShadow: "0 4px 30px rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(217, 217, 217, 0.4)",
          padding: "1rem",
          // color: "white",
        }}
      >
        <PlaceholderPage title="Inicio">
          <Typography>
            Sesión colaborativa para diseñar y priorizar iniciativas de OKR.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              component={RouterLink}
              to="/facilitador/nueva"
              variant="contained"
              sx={{ width: { xs: "100%", sm: "50%" } }}
            >
              Crear sesión
            </Button>
            <Button
              component={RouterLink}
              to="/participar"
              variant="outlined"
              sx={{
                width: {
                  xs: "100%",
                  sm: "50%",
                  color: "white",
                  // borderColor: "white",
                  borderColor: "rgba(255, 255, 255, 0.5)",
                  "&:hover": { backgroundColor: "rgba(71, 71, 71, 0.41)" },
                },
              }}
            >
              Participar
            </Button>
          </Stack>
          <BackupImportControl />
        </PlaceholderPage>
      </Box>
    </Box>
  );
}
