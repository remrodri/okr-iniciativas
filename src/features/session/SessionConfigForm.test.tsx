import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SessionConfigForm } from './SessionConfigForm';

function setup() {
  const onSubmit = vi.fn();
  render(<SessionConfigForm onSubmit={onSubmit} />);
  return { onSubmit, user: userEvent.setup() };
}

describe('formulario de configuración', () => {
  afterEach(cleanup);

  it('resume el total de iniciativas al cambiar las cantidades', async () => {
    const { user } = setup();

    await user.clear(screen.getByLabelText('Participantes esperados'));
    await user.type(screen.getByLabelText('Participantes esperados'), '4');
    await user.clear(
      screen.getByLabelText('Iniciativas por participante'),
    );
    await user.type(screen.getByLabelText('Iniciativas por participante'), '3');

    expect(screen.getByText('Iniciativas totales: 12')).toBeInTheDocument();
  });

  it('muestra el contador de caracteres de X0 y Xf', async () => {
    const { user } = setup();

    await user.type(screen.getByLabelText('X0'), 'abc');
    await user.type(screen.getByLabelText('Xf'), 'de');

    expect(screen.getByText('3 / 1000')).toBeInTheDocument();
    expect(screen.getByText('2 / 1000')).toBeInTheDocument();
  });

  it('impide crear con campos obligatorios vacíos', async () => {
    const { onSubmit, user } = setup();

    await user.click(screen.getByRole('button', { name: 'Crear sesión' }));

    expect(
      screen.getByText('El campo X0 debe tener entre 1 y 1000 caracteres.'),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('impide cantidades fuera de rango', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText('X0'), 'Situación inicial');
    await user.type(screen.getByLabelText('Xf'), 'Situación futura');
    await user.clear(
      screen.getByLabelText('Iniciativas por participante'),
    );
    await user.type(
      screen.getByLabelText('Iniciativas por participante'),
      '11',
    );

    await user.click(screen.getByRole('button', { name: 'Crear sesión' }));

    expect(
      screen.getByText(
        'Las iniciativas por participante deben ser un entero entre 1 y 10.',
      ),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía una configuración válida', async () => {
    const { onSubmit, user } = setup();

    await user.type(screen.getByLabelText('X0'), '  Situación inicial  ');
    await user.type(screen.getByLabelText('Xf'), 'Situación futura');
    await user.clear(screen.getByLabelText('Participantes esperados'));
    await user.type(screen.getByLabelText('Participantes esperados'), '4');
    await user.clear(
      screen.getByLabelText('Iniciativas por participante'),
    );
    await user.type(screen.getByLabelText('Iniciativas por participante'), '2');
    await user.click(screen.getByRole('button', { name: 'Crear sesión' }));

    expect(onSubmit).toHaveBeenCalledWith({
      x0: 'Situación inicial',
      xf: 'Situación futura',
      expectedParticipants: 4,
      initiativesPerParticipant: 2,
      totalInitiatives: 8,
    });
  });
});
