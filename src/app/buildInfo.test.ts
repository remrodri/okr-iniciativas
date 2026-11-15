import { describe, expect, it } from 'vitest';

import { APP_NAME } from './buildInfo';

describe('buildInfo', () => {
  it('expone el nombre de la aplicación', () => {
    expect(APP_NAME).toBe('OKR Iniciativas');
  });
});
