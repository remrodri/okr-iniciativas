import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { IceEvaluationStepper } from './IceEvaluationStepper';

afterEach(cleanup);

const initiatives = Array.from({ length: 15 }, (_, index) => ({
  id: `i${index + 1}`,
  text: `Iniciativa finalista ${index + 1}`,
}));

describe('evaluación ICE paso a paso', () => {
  it('completa 15 iniciativas, detecta faltantes y confirma el resumen', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <div style={{ width: 360, overflowX: 'hidden' }}>
        <IceEvaluationStepper
          initiatives={initiatives}
          initialRatings={{}}
          submitted={false}
          onRatingsChange={vi.fn()}
          onSubmit={onSubmit}
        />
      </div>,
    );

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(
      screen.getByText('Completa Impacto, Confianza y Facilidad.'),
    ).toBeInTheDocument();

    for (let index = 0; index < 15; index += 1) {
      await user.type(screen.getByLabelText('Impacto'), '8');
      await user.type(screen.getByLabelText('Confianza'), '7');
      await user.type(screen.getByLabelText('Facilidad'), '6');
      await user.click(
        screen.getByRole('button', {
          name: index === 14 ? 'Revisar evaluación' : 'Siguiente',
        }),
      );
    }

    expect(
      screen.getByRole('heading', { name: 'Resumen de evaluación ICE' }),
    ).toBeInTheDocument();
    expect(screen.getByText('15 de 15 evaluadas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar evaluación' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(Object.keys(onSubmit.mock.calls[0]?.[0] ?? {})).toHaveLength(15);
  }, 15_000);

  it('recupera calificaciones pendientes y muestra el estado confirmado', () => {
    const ratings = { i1: { impact: 3, confidence: 10, ease: 8 } };
    const { rerender } = render(
      <IceEvaluationStepper
        initiatives={[initiatives[0]!]}
        initialRatings={ratings}
        submitted={false}
        onRatingsChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('Impacto')).toHaveValue(3);

    rerender(
      <IceEvaluationStepper
        initiatives={[initiatives[0]!]}
        initialRatings={ratings}
        submitted
        onRatingsChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText(/evaluación ice confirmada/i)).toBeInTheDocument();
  });
});
