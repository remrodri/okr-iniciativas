import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";

import { PlaceholderPage } from "./PlaceholderPage";
import { BackupImportControl } from "@/features/excel/BackupImportControl";
import Box from "@mui/material/Box";
import PersonIcon from "@mui/icons-material/Person";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

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
        // background: "rgba(0, 0, 0, 0.48)",
        borderRadius: "10px",
        boxShadow: "0 4px 30px rgb(0, 0, 0)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(0, 0, 0, 0.4)",
      }}
    >
      <Box
        sx={{
          background: "rgb(255 250 250)",
          borderRadius: "10px",
          boxShadow: "0 4px 30px rgb(0, 0, 0)",
          WebkitBackdropFilter: "blur(10px)",
          border: "1px solid rgba(217, 217, 217, 0.4)",
          padding: "2rem",
        }}
      >
        <PlaceholderPage title="INICIO">
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
              <PersonIcon sx={{ mr: 1 }} />
              CREAR SESIÓN
            </Button>
            <Button
              component={RouterLink}
              to="/participar"
              variant="contained"
              color="inherit"
              sx={{
                width: {
                  xs: "100%",
                  sm: "50%",
                  color: "black",
                  // borderColor: "white",
                  borderColor: "rgba(255, 255, 255, 0.5)",
                  "&:hover": {
                    backgroundColor: "rgb(136, 135, 135)",
                    color: "white",
                  },
                },
              }}
            >
              <PeopleAltIcon sx={{ mr: 1 }} />
              PARTICIPAR EN SESIÓN
            </Button>
          </Stack>
          <BackupImportControl />
        </PlaceholderPage>
      </Box>
    </Box>
  );
}
