import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FacilitatorPanel } from './FacilitatorPanel';

const data = {
  sessionId: 'session-1',
  publicCode: 'ABCD2345',
  stage: 'SALA_DE_ESPERA' as const,
  participants: [
    {
      participantId: 'participant-1',
      alias: 'Faro',
      connected: true,
      progress: {
        brainstormingSubmitted: true,
        refinementSubmitted: false,
        tieBreakSubmitted: false,
        iceSubmitted: false,
      },
    },
    {
      participantId: 'participant-2',
      alias: 'Luna',
      connected: false,
      progress: {
        brainstormingSubmitted: false,
        refinementSubmitted: false,
        tieBreakSubmitted: false,
        iceSubmitted: false,
      },
    },
  ],
};

describe('panel del facilitador', () => {
  afterEach(cleanup);

  it('separa el acceso público de la recuperación privada', () => {
    render(
      <FacilitatorPanel
        data={data}
        participantLink="https://example.test/#/participar/ABCD2345"
        facilitatorToken="token-privado"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Acceso de participantes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'Recuperación privada del facilitador',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('ABCD2345')).toBeInTheDocument();
    expect(screen.getByText('token-privado')).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'QR público de la sesión' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'QR privado de recuperación' }),
    ).toBeInTheDocument();
  });

  it('muestra alias, conexión y avance', () => {
    render(
      <FacilitatorPanel
        data={data}
        participantLink="https://example.test/#/participar/ABCD2345"
      />,
    );

    expect(screen.getByText('Faro')).toBeInTheDocument();
    expect(screen.getByText('Luna')).toBeInTheDocument();
    expect(screen.getByText('Conectado')).toBeInTheDocument();
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
    expect(screen.getByText('Iniciativas enviadas')).toBeInTheDocument();
    expect(screen.getByText('Sin envíos')).toBeInTheDocument();
  });
});
