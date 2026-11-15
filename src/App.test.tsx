import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from './App';
import { AppThemeProvider } from './app/AppThemeProvider';

describe('App', () => {
  afterEach(() => {
    window.location.hash = '';
  });

  it('muestra la pantalla de inicio en la ruta raíz', () => {
    window.location.hash = '#/';

    render(
      <AppThemeProvider>
        <App />
      </AppThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Inicio' })).toBeInTheDocument();
    expect(screen.getByText('OKR Iniciativas')).toBeInTheDocument();
  });
});
