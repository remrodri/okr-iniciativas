import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TieBreakBallotForm } from './TieBreakBallotForm';

afterEach(cleanup);

describe('votación móvil de desempate', () => {
  it('completa 2 puestos entre 4 iniciativas empatadas', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <div style={{ width: 360, overflowX: 'hidden' }}>
        <TieBreakBallotForm
          initiatives={[
            { id: 'i1', text: 'Primera empatada' },
            { id: 'i2', text: 'Segunda empatada' },
            { id: 'i3', text: 'Tercera empatada' },
            { id: 'i4', text: 'Cuarta empatada' },
          ]}
          slotsRemaining={2}
          initialSelection={[]}
          submitted={false}
          onSelectionChange={vi.fn()}
          onSubmit={onSubmit}
        />
      </div>,
    );

    expect(screen.getAllByRole('checkbox')).toHaveLength(4);
    await user.click(screen.getByRole('checkbox', { name: 'Primera empatada' }));
    await user.click(screen.getByRole('checkbox', { name: 'Tercera empatada' }));
    expect(screen.getByText('2 de 2 seleccionadas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Revisar desempate' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar desempate' }));

    expect(onSubmit).toHaveBeenCalledWith(['i1', 'i3']);
  });
});
