import { describe, expect, it } from 'vitest';

import { generateAccessToken, generatePublicCode } from './tokens';

function seededBytes(seed: number) {
  let state = seed;
  return (length: number): Uint8Array => {
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      state = (state * 1664525 + 1013904223) % 4294967296;
      bytes[index] = state % 256;
    }
    return bytes;
  };
}

describe('tokens de acceso', () => {
  it('genera tokens de al menos 128 bits en hexadecimal', () => {
    const token = generateAccessToken(seededBytes(1));

    expect(token).toMatch(/^[0-9a-f]+$/);
    expect(token.length).toBeGreaterThanOrEqual(32);
  });

  it('genera tokens distintos con fuentes distintas', () => {
    expect(generateAccessToken(seededBytes(1))).not.toBe(
      generateAccessToken(seededBytes(2)),
    );
  });

  it('genera códigos públicos cortos sin caracteres ambiguos', () => {
    const code = generatePublicCode(seededBytes(9));

    expect(code).toMatch(/^[A-Z2-9]+$/);
    expect(code).not.toMatch(/[O0I1]/);
    expect(code.length).toBe(8);
  });

  it('rechaza fuentes que no devuelven suficientes bytes', () => {
    expect(() => generateAccessToken(() => new Uint8Array(1))).toThrow();
    expect(() => generatePublicCode(() => new Uint8Array(1))).toThrow();
  });
});
