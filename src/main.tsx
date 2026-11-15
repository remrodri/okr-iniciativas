import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { AppThemeProvider } from './app/AppThemeProvider';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('No se encontró el elemento raíz de la aplicación.');
}

createRoot(rootElement).render(
  <StrictMode>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </StrictMode>,
);
