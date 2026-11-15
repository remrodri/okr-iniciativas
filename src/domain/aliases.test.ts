import { describe, expect, it } from 'vitest';

import { assignUniqueAliases, NEUTRAL_ALIASES } from './aliases';
import { DomainError } from './errors';

function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('alias neutrales', () => {
  it('dispone de un catálogo suficiente y sin números', () => {
    expect(NEUTRAL_ALIASES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(NEUTRAL_ALIASES).size).toBe(NEUTRAL_ALIASES.length);
    for (const alias of NEUTRAL_ALIASES) {
      expect(alias).not.toMatch(/\d/);
      expect(alias.trim()).toBe(alias);
      expect(alias.length).toBeGreaterThan(1);
    }
  });

  it('genera 40 alias únicos de forma determinista con la misma semilla', () => {
    const first = assignUniqueAliases(40, seededRandom(42));
    const second = assignUniqueAliases(40, seededRandom(42));

    expect(first).toHaveLength(40);
    expect(new Set(first).size).toBe(40);
    expect(first).toEqual(second);
    expect(first.every((alias) => NEUTRAL_ALIASES.includes(alias))).toBe(true);
  });

  it('puede generar cantidades menores', () => {
    const aliases = assignUniqueAliases(6, seededRandom(7));

    expect(aliases).toHaveLength(6);
    expect(new Set(aliases).size).toBe(6);
  });

  it('rechaza cantidades inválidas', () => {
    for (const count of [0, -1, 41]) {
      expect(() => assignUniqueAliases(count, seededRandom(1))).toThrowError(
        DomainError,
      );
    }
  });
});
