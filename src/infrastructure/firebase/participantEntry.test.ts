import { describe, expect, it } from 'vitest';

import { normalizePublicCode, validatePrivateName } from './participantEntry';

describe('datos de ingreso del participante', () => {
  it('normaliza el código público para su consulta', () => {
    expect(normalizePublicCode(' abcd-2345 ')).toBe('ABCD2345');
  });

  it('exige un nombre real no vacío', () => {
    expect(() => validatePrivateName('   ')).toThrow(
      'Escribe tu nombre real para ingresar.',
    );
    expect(validatePrivateName('  Ana Pérez  ')).toBe('Ana Pérez');
  });
});
