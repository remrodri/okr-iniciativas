import { Box } from "@mui/material";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

interface PlaceholderPageProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function PlaceholderPage({ title, children }: PlaceholderPageProps) {
  return (
    <Box
      // maxWidth="sm"
      // sx={{ py: 3 }}
      sx={{
        // background: "rgb(0, 0, 0)",
        flexGrow: 1,
        width: "100%",
        display: "flex",

      }}
    >
      <Stack
        spacing={2}
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography component="h1" variant="h1">
          {title}
        </Typography>
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            width: "100%",
          }}
        >
          {children}
        </Box>
      </Stack>
    </Box>
  );
}
