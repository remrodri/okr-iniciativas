import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ParticipantAccessForm } from './ParticipantAccessForm';

afterEach(cleanup);

describe('ingreso móvil del participante', () => {
  it('solicita código público, clave personal y nombre privado', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ParticipantAccessForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('Código de sesión'), 'abcd2345');
    await user.type(screen.getByLabelText('Clave personal'), 'clave-secreta');
    await user.type(screen.getByLabelText('Tu nombre real'), '  Ana Pérez  ');
    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(onSubmit).toHaveBeenCalledWith({
      publicCode: 'ABCD2345',
      token: 'clave-secreta',
      realName: 'Ana Pérez',
    });
  });

  it('usa el código y la clave recibidos por QR sin mostrarlos como texto público', () => {
    render(
      <ParticipantAccessForm
        initialPublicCode="ABCD2345"
        initialToken="secreto-del-qr"
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Código de sesión')).toHaveValue('ABCD2345');
    expect(screen.getByLabelText('Clave personal')).toHaveAttribute(
      'type',
      'password',
    );
    expect(screen.queryByText('secreto-del-qr')).not.toBeInTheDocument();
  });

  it('impide continuar con datos incompletos en un contenedor de 360 px', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <div style={{ width: 360 }}>
        <ParticipantAccessForm onSubmit={onSubmit} />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Ingresar' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getAllByText('Este campo es obligatorio.')).toHaveLength(3);
  });
});
