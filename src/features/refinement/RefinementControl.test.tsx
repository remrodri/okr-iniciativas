import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RefinementControl } from './RefinementControl';

const texts = {
  i1: 'Mejorar onboarding',
  i2: 'Onboarding más rápido',
  i3: 'Guiar al nuevo ingreso',
};

function baseProps() {
  return {
    initiativeTexts: texts,
    availableCount: 3,
    finalistCount: null,
    finalistIds: [],
    tie: null,
    expectedParticipants: 2,
    completeBallots: 2,
    onOpen: vi.fn(),
    onResolve: vi.fn(),
    onDecide: vi.fn(),
  };
}

describe('control de depuración', () => {
  afterEach(cleanup);

  it('valida N y abre la depuración', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    render(<RefinementControl {...props} stage="REVISION" />);

    const input = screen.getByLabelText('Cantidad de finalistas (N)');
    await user.clear(input);
    await user.type(input, '2');
    await user.click(screen.getByRole('button', { name: 'Abrir depuración' }));

    expect(props.onOpen).toHaveBeenCalledWith(2);
  });

  it('advierte incompletos y exige confirmación explícita', async () => {
    const props = { ...baseProps(), completeBallots: 1 };
    const user = userEvent.setup();
    render(<RefinementControl {...props} stage="DEPURACION" />);

    expect(screen.getByText('1 de 2 votos completos')).toBeInTheDocument();
    expect(
      screen.getByText(/hay participantes sin voto completo/i),
    ).toBeInTheDocument();

    const resolve = screen.getByRole('button', {
      name: 'Cerrar depuración y calcular finalistas',
    });
    expect(resolve).toBeDisabled();

    await user.click(
      screen.getByLabelText('Confirmo continuar con votos incompletos'),
    );
    await user.click(resolve);

    expect(props.onResolve).toHaveBeenCalledWith(true);
  });

  it('permite cerrar sin advertencia cuando todos votaron', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    render(<RefinementControl {...props} stage="DEPURACION" />);

    await user.click(
      screen.getByRole('button', {
        name: 'Cerrar depuración y calcular finalistas',
      }),
    );

    expect(props.onResolve).toHaveBeenCalledWith(false);
  });

  it('persiste la decisión de desempate con los puestos exactos', async () => {
    const props = {
      ...baseProps(),
      tie: { candidateIds: ['i1', 'i2'], slotsRemaining: 1 },
    };
    const user = userEvent.setup();
    render(<RefinementControl {...props} stage="DESEMPATE_DEPURACION" />);

    await user.click(screen.getByLabelText('Mejorar onboarding'));
    await user.click(
      screen.getByRole('button', { name: 'Confirmar desempate' }),
    );

    expect(props.onDecide).toHaveBeenCalledWith(['i1']);
  });

  it('muestra el resultado con N finalistas', () => {
    render(
      <RefinementControl
        {...baseProps()}
        stage="CONFIGURACION_ICE"
        finalistIds={['i1', 'i3']}
      />,
    );

    expect(screen.getByText('2 iniciativas finalistas')).toBeInTheDocument();
    expect(screen.getByText('Mejorar onboarding')).toBeInTheDocument();
    expect(screen.getByText('Guiar al nuevo ingreso')).toBeInTheDocument();
  });
});
