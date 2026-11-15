import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: { main: '#1f4e79' },
    secondary: { main: '#7a3e00' },
    background: { default: '#f7f8fa', paper: '#ffffff' },
    text: { primary: '#1a1a1a', secondary: '#4a4a4a' },
  },
  breakpoints: {
    values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 },
  },
  typography: {
    fontSize: 16,
    fontFamily: [
      'system-ui',
      '-apple-system',
      'Segoe UI',
      'Roboto',
      'Helvetica',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: { fontSize: '1.75rem', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: 44,
          textTransform: 'none',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          minWidth: 44,
          minHeight: 44,
        },
      },
    },
  },
});
