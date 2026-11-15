import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Initiative } from '@/domain/types';
import { ReviewPanel } from './ReviewPanel';

function initiative(
  id: string,
  text: string,
  overrides: Partial<Initiative> = {},
): Initiative {
  return {
    id,
    text,
    authorIds: ['secret-author-1'],
    originals: [],
    status: 'ACTIVE',
    mergedIntoId: null,
    revision: 1,
    ...overrides,
  };
}

const initiatives = [
  initiative('i1', 'Mejorar onboarding'),
  initiative('i2', 'Onboarding más rápido'),
];

describe('panel de revisión ciega', () => {
  afterEach(cleanup);

  it('muestra las iniciativas sin autores ni identificadores privados', () => {
    render(
      <ReviewPanel
        initiatives={initiatives}
        clarifications={[]}
        onCorrect={vi.fn()}
        onRequestClarification={vi.fn()}
        onFuse={vi.fn()}
      />,
    );

    expect(screen.getByText('Mejorar onboarding')).toBeInTheDocument();
    expect(
      screen.getByText(/la autoría permanece oculta/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secret-author-1/)).not.toBeInTheDocument();
  });

  it('envía una corrección de texto', async () => {
    const onCorrect = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewPanel
        initiatives={[initiatives[0] as Initiative]}
        clarifications={[]}
        onCorrect={onCorrect}
        onRequestClarification={vi.fn()}
        onFuse={vi.fn()}
      />,
    );

    await user.type(
      screen.getByLabelText('Corrección de ortografía o puntuación'),
      'Mejorar el onboarding',
    );
    await user.click(screen.getByRole('button', { name: 'Guardar corrección' }));

    expect(onCorrect).toHaveBeenCalledWith('i1', 'Mejorar el onboarding');
  });

  it('envía una solicitud anónima de aclaración', async () => {
    const onRequestClarification = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewPanel
        initiatives={[initiatives[0] as Initiative]}
        clarifications={[]}
        onCorrect={vi.fn()}
        onRequestClarification={onRequestClarification}
        onFuse={vi.fn()}
      />,
    );

    await user.type(
      screen.getByLabelText('Solicitud anónima de aclaración'),
      '¿A qué público se refiere?',
    );
    await user.click(
      screen.getByRole('button', { name: 'Solicitar aclaración' }),
    );

    expect(onRequestClarification).toHaveBeenCalledWith(
      'i1',
      '¿A qué público se refiere?',
    );
  });

  it('fusiona las seleccionadas conservando el texto consolidado', async () => {
    const onFuse = vi.fn();
    const user = userEvent.setup();
    render(
      <ReviewPanel
        initiatives={initiatives}
        clarifications={[]}
        onCorrect={vi.fn()}
        onRequestClarification={vi.fn()}
        onFuse={onFuse}
      />,
    );

    const checkboxes = screen.getAllByLabelText('Incluir en fusión');
    await user.click(checkboxes[0] as HTMLElement);
    await user.click(checkboxes[1] as HTMLElement);
    await user.type(
      screen.getByLabelText('Texto consolidado'),
      'Acelerar el onboarding',
    );
    await user.click(
      screen.getByRole('button', { name: 'Fusionar seleccionadas' }),
    );

    expect(onFuse).toHaveBeenCalledWith('i1', ['i2'], 'Acelerar el onboarding');
  });

  it('muestra versiones originales de una fusión sin autores', () => {
    const fused = initiative('i1', 'Acelerar el onboarding', {
      authorIds: ['secret-author-1', 'secret-author-2'],
    });
    const source = initiative('i2', 'Onboarding más rápido', {
      authorIds: ['secret-author-2'],
      status: 'FUSED',
      mergedIntoId: 'i1',
    });

    render(
      <ReviewPanel
        initiatives={[fused, source]}
        clarifications={[]}
        onCorrect={vi.fn()}
        onRequestClarification={vi.fn()}
        onFuse={vi.fn()}
      />,
    );

    expect(
      screen.getByText('Versiones originales conservadas'),
    ).toBeInTheDocument();
    expect(screen.getByText('Onboarding más rápido')).toBeInTheDocument();
    expect(screen.queryByText(/secret-author/)).not.toBeInTheDocument();
  });
});
