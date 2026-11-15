import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ParticipantSyncStatus } from './ParticipantSyncStatus';

afterEach(cleanup);

describe('estado de sincronización del participante', () => {
  it('distingue un borrador sin conexión de un envío confirmado', () => {
    const { rerender } = render(
      <ParticipantSyncStatus
        online={false}
        status="IDLE"
        hasDraft
        stageLabel="Brainstorming"
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText(/sin conexión/i)).toBeInTheDocument();
    expect(screen.getByText(/borrador permanece/i)).toBeInTheDocument();
    expect(screen.queryByText(/confirmado por firebase/i)).not.toBeInTheDocument();

    rerender(
      <ParticipantSyncStatus
        online
        status="CONFIRMED"
        hasDraft={false}
        stageLabel="Brainstorming"
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByText(/confirmado por firebase/i)).toBeInTheDocument();
  });

  it('muestra enviando y permite reintentar un error', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(
      <ParticipantSyncStatus
        online
        status="SENDING"
        hasDraft
        stageLabel="Depuración"
        onRetry={onRetry}
      />,
    );
    expect(screen.getByText(/enviando a firebase/i)).toBeInTheDocument();

    rerender(
      <ParticipantSyncStatus
        online
        status="ERROR"
        hasDraft
        stageLabel="Depuración"
        onRetry={onRetry}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Reintentar envío' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
