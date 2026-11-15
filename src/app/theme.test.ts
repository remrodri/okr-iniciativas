import { describe, expect, it } from 'vitest';

import { theme } from './theme';

describe('tema mobile-first', () => {
  it('documenta los breakpoints del plan', () => {
    expect(theme.breakpoints.values.xs).toBe(0);
    expect(theme.breakpoints.values.sm).toBe(600);
    expect(theme.breakpoints.values.md).toBe(900);
    expect(theme.breakpoints.values.lg).toBe(1200);
  });

  it('usa una tipografía legible y controles táctiles de 44 px', () => {
    expect(theme.typography.fontSize).toBeGreaterThanOrEqual(14);
    const button = theme.components?.MuiButton?.styleOverrides;
    expect(button).toBeDefined();
    expect(JSON.stringify(button)).toMatch(/minHeight":(4[4-9]|[5-9]\d)/);
  });
});
