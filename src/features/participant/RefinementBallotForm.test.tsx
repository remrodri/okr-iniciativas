import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RefinementBallotForm } from './RefinementBallotForm';

afterEach(cleanup);

const initiatives = [
  { id: 'i1', text: 'Mejorar el proceso de ingreso' },
  { id: 'i2', text: 'Reducir tiempos de espera' },
  { id: 'i3', text: 'Automatizar reportes semanales' },
  { id: 'i4', text: 'Capacitar al equipo operativo' },
];

describe('votación móvil de depuración', () => {
  it('impide N−1 y N+1, muestra contador y confirma exactamente N', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <div style={{ width: 360, overflowX: 'hidden' }}>
        <RefinementBallotForm
          initiatives={initiatives}
          requiredCount={2}
          initialSelection={[]}
          submitted={false}
          onSelectionChange={vi.fn()}
          onSubmit={onSubmit}
        />
      </div>,
    );

    expect(screen.getByText('0 de 2 seleccionadas')).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: /mejorar el proceso/i }));
    expect(screen.getByRole('button', { name: 'Revisar voto' })).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /reducir tiempos/i }));
    expect(screen.getByText('2 de 2 seleccionadas')).toBeInTheDocument();
    expect(
      screen.getByRole('checkbox', { name: /automatizar reportes/i }),
    ).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Revisar voto' }));
    expect(screen.getByRole('heading', { name: 'Revisa tu voto' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar voto' }));
    expect(onSubmit).toHaveBeenCalledWith(['i1', 'i2']);
  });

  it('recupera una selección pendiente y muestra el estado confirmado', () => {
    const { rerender } = render(
      <RefinementBallotForm
        initiatives={initiatives}
        requiredCount={2}
        initialSelection={['i1']}
        submitted={false}
        onSelectionChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText('1 de 2 seleccionadas')).toBeInTheDocument();

    rerender(
      <RefinementBallotForm
        initiatives={initiatives}
        requiredCount={2}
        initialSelection={['i1', 'i2']}
        submitted
        onSelectionChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText(/voto confirmado/i)).toBeInTheDocument();
  });
});
