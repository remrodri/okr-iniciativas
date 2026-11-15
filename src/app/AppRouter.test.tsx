import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '@/App';

function renderAt(hash: string) {
  window.location.hash = hash;
  return render(<App />);
}

describe('rutas hash', () => {
  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it.each([
    ['#/', 'Inicio'],
    ['#/facilitador/nueva', 'Nueva sesión'],
    ['#/facilitador/abc123', 'Panel del facilitador'],
    ['#/participar', 'Acceso de participante'],
    ['#/participar/abc123', 'Sesión de participante'],
    ['#/consulta/local1', 'Consulta de respaldo'],
  ])('abre %s sin recargar la página', (hash, heading) => {
    renderAt(hash);

    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('mantiene la vista al recargar con el mismo hash', () => {
    renderAt('#/facilitador/nueva');
    expect(
      screen.getByRole('heading', { name: 'Nueva sesión' }),
    ).toBeInTheDocument();

    cleanup();
    render(<App />);

    expect(
      screen.getByRole('heading', { name: 'Nueva sesión' }),
    ).toBeInTheDocument();
  });

  it('retira la clave personal del historial al abrir un QR privado', async () => {
    renderAt('#/participar/ABCD2345/secreto-personal');

    expect(screen.getByLabelText('Clave personal')).toHaveValue(
      'secreto-personal',
    );
    await waitFor(() =>
      expect(window.location.hash).toBe('#/participar/ABCD2345'),
    );
  });
});
