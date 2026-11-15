import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResultsPanel } from './ResultsPanel';

const ranking = [
  {
    initiativeId: 'i1',
    impactMedian: 4,
    confidenceMedian: 10,
    easeMedian: 10,
    score: 400,
    position: 1,
  },
  {
    initiativeId: 'i2',
    impactMedian: 3,
    confidenceMedian: 10,
    easeMedian: 10,
    score: 300,
    position: 2,
  },
  {
    initiativeId: 'i3',
    impactMedian: 3,
    confidenceMedian: 10,
    easeMedian: 10,
    score: 300,
    position: 2,
  },
];

const authors = [
  { initiativeId: 'i1', names: ['Ana'] },
  { initiativeId: 'i2', names: ['Luis'] },
  { initiativeId: 'i3', names: ['Marta'] },
];

function baseProps() {
  return {
    ranking,
    initiativeTexts: {
      i1: 'Mejorar onboarding',
      i2: 'Onboarding más rápido',
      i3: 'Guiar al nuevo ingreso',
    },
    authors,
    expiresAt: null,
    onPublish: vi.fn(),
    onFinalize: vi.fn(),
    onReopen: vi.fn(),
  };
}

describe('panel de resultados', () => {
  afterEach(cleanup);

  it('publica el resultado solo desde la evaluación ICE', async () => {
    const props = baseProps();
    const user = userEvent.setup();
    render(
      <ResultsPanel
        {...props}
        stage="EVALUACION_ICE"
        ranking={[]}
        authors={[]}
      />,
    );

    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Publicar resultado final' }),
    );

    expect(props.onPublish).toHaveBeenCalledTimes(1);
  });

  it('muestra medianas, puntuación, empates y autoría revelada', () => {
    render(<ResultsPanel {...baseProps()} stage="RESULTADO_FINAL" />);

    expect(
      screen.getByRole('heading', { name: 'Resultado final' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/400,00/)).toBeInTheDocument();
    expect(screen.getAllByText(/300,00/)).toHaveLength(2);
    expect(screen.getAllByText('Puesto 2')).toHaveLength(2);
    expect(screen.getAllByText('Empate')).toHaveLength(2);
    expect(screen.getByText(/Ana/)).toBeInTheDocument();
    expect(screen.getByText(/Luis/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Finalizar sesión' }),
    ).toBeInTheDocument();
  });

  it('muestra el vencimiento y permite reabrir durante la recuperación', async () => {
    const props = {
      ...baseProps(),
      expiresAt: '2026-11-15T10:00:00.000Z',
    };
    const user = userEvent.setup();
    render(<ResultsPanel {...props} stage="FINALIZADA" />);

    expect(screen.getByText('Sesión finalizada')).toBeInTheDocument();
    expect(screen.getByText(/Vence:/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Finalizar sesión' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reabrir sesión' }));
    expect(props.onReopen).toHaveBeenCalledTimes(1);
  });
});



