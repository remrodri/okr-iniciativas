import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useOnlineStatus } from './useOnlineStatus';

afterEach(cleanup);

describe('detección de conexión', () => {
  it('reacciona a desconexión y reconexión del navegador', () => {
    const { result } = renderHook(() => useOnlineStatus());

    act(() => window.dispatchEvent(new Event('offline')));
    expect(result.current).toBe(false);
    act(() => window.dispatchEvent(new Event('online')));
    expect(result.current).toBe(true);
  });
});
