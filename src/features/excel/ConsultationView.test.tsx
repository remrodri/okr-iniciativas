import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SessionSnapshot } from '@/domain/ports';
import { ConsultationView } from './ConsultationView';

const snapshot = {
  localId: 'import-1',
  sessionId: 'session-1',
  revision: 1,
  savedAt: '2026-11-15T10:00:00.000Z',
  formatVersion: 1,
  state: {
    session: {
      id: 'session-1',
      stage: 'EVALUACION_ICE',
      x0: 'Retrasos actuales',
      xf: 'Entregas puntuales',
      expectedParticipants: 2,
      finalistCount: 1,
    },
    participants: [
      { alias: 'Faro', progress: { iceSubmitted: true } },
      { alias: 'Nexo', progress: { iceSubmitted: false } },
    ],
    initiatives: [{ id: 'i-1', text: 'Automatizar registro' }],
    ranking: [],
  },
} as unknown as SessionSnapshot;

describe('ConsultationView', () => {
  it('presenta el respaldo sin controles de edición y permite solicitar reactivación', async () => {
    const onReactivate = vi.fn();
    const user = userEvent.setup();
    render(
      <ConsultationView snapshot={snapshot} onReactivate={onReactivate} />,
    );

    expect(screen.getByText('Retrasos actuales')).toBeInTheDocument();
    expect(screen.getByText('Automatizar registro')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('1 de 2 evaluaciones ICE enviadas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reactivar como nueva sesión/i }));
    expect(onReactivate).toHaveBeenCalledOnce();
  });
});
