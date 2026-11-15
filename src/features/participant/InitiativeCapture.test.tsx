import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InitiativeCapture } from './InitiativeCapture';

afterEach(cleanup);

describe('captura móvil de iniciativas', () => {
  it('recupera el borrador y exige exactamente la cantidad configurada', async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <div style={{ width: 360 }}>
        <InitiativeCapture
          count={3}
          initialDrafts={['Idea recuperada', '', '']}
          submitted={false}
          clarifications={[]}
          onDraftChange={onDraftChange}
          onSubmit={onSubmit}
          onRespond={vi.fn()}
        />
      </div>,
    );

    expect(screen.getByLabelText('Iniciativa 1')).toHaveValue(
      'Idea recuperada',
    );
    await user.type(screen.getByLabelText('Iniciativa 2'), 'Segunda idea');
    await user.click(screen.getByRole('button', { name: 'Revisar iniciativas' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Completa las 3 iniciativas.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Iniciativa 3'), 'Tercera idea');
    await user.click(screen.getByRole('button', { name: 'Revisar iniciativas' }));
    expect(screen.getByRole('heading', { name: 'Revisión antes de enviar' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmar envío' }));

    expect(onSubmit).toHaveBeenCalledWith([
      'Idea recuperada',
      'Segunda idea',
      'Tercera idea',
    ]);
    expect(onDraftChange).toHaveBeenCalled();
  });

  it('muestra el envío confirmado y permite responder una aclaración propia', async () => {
    const user = userEvent.setup();
    const onRespond = vi.fn();
    render(
      <InitiativeCapture
        count={1}
        initialDrafts={['Mejorar onboarding']}
        submitted
        clarifications={[
          {
            id: 'c1',
            initiativeId: 'p1-1',
            message: '¿A qué área se aplica?',
            status: 'OPEN',
            createdAt: '2026-11-14T10:00:00.000Z',
            responseText: null,
          },
        ]}
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        onRespond={onRespond}
      />,
    );

    expect(screen.getByText('Envío confirmado')).toBeInTheDocument();
    await user.type(
      screen.getByLabelText('Respuesta a la aclaración'),
      'Se aplica a Operaciones.',
    );
    await user.click(screen.getByRole('button', { name: 'Enviar respuesta' }));
    expect(onRespond).toHaveBeenCalledWith('c1', 'Se aplica a Operaciones.');
  });
});
