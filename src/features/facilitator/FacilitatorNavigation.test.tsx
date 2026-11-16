import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FacilitatorNavigation } from './FacilitatorNavigation';

describe('navegación del facilitador', () => {
  afterEach(cleanup);

  it('cambia de sección sin navegar a otra ruta', () => {
    const onSelect = vi.fn();
    render(
      <FacilitatorNavigation
        selected="ACCESS"
        onSelect={onSelect}
        hasPersonalAccess
        hasRecovery
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Participantes' }));
    expect(onSelect).toHaveBeenCalledWith('PARTICIPANTS');
  });

  it('deshabilita secretos que ya no están disponibles tras recargar', () => {
    render(
      <FacilitatorNavigation
        selected="ACCESS"
        onSelect={() => undefined}
        hasPersonalAccess={false}
        hasRecovery={false}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Accesos personales' }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Recuperación' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});
