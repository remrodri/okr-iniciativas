import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SessionSnapshot } from '@/domain/ports';
import { BackupExportButton } from './BackupExportButton';

const snapshot = {
  localId: 'local-1',
  sessionId: 'session-1',
  revision: 1,
  savedAt: '2026-11-15T00:00:00.000Z',
  formatVersion: 1,
  state: {},
} as SessionSnapshot;

describe('BackupExportButton', () => {
  it('muestra progreso visible mientras genera el respaldo', async () => {
    let finish: ((bytes: Uint8Array) => void) | undefined;
    const exporter = vi.fn(
      (_snapshot: SessionSnapshot, onProgress: (value: number) => void) => {
        onProgress(50);
        return new Promise<Uint8Array>((resolve) => {
          finish = resolve;
        });
      },
    );
    const download = vi.fn();
    const user = userEvent.setup();
    render(
      <BackupExportButton
        snapshot={snapshot}
        exporter={exporter}
        download={download}
      />,
    );

    await user.click(screen.getByRole('button', { name: /exportar respaldo/i }));
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('Generando respaldo: 50 %')).toBeInTheDocument();

    finish?.(new Uint8Array([1, 2, 3]));
    expect(await screen.findByText('Respaldo descargado.')).toBeInTheDocument();
    expect(download).toHaveBeenCalledOnce();
  });
});
