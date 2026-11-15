import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import {
  correctInitiativeText,
  createClarificationRequest,
  createInitiative,
  fuseInitiatives,
  respondToClarification,
} from './initiatives';
import { LIMITS } from './limits';

const now = '2026-11-14T10:00:00.000Z';

function initiative(id: string, text: string, authorId: string) {
  return createInitiative({
    id,
    text,
    authorIds: [authorId],
    now,
  });
}

describe('iniciativas', () => {
  it('crea una iniciativa válida y recorta el texto', () => {
    const created = initiative('i1', '  Mejorar onboarding  ', 'p1');

    expect(created.text).toBe('Mejorar onboarding');
    expect(created.authorIds).toEqual(['p1']);
    expect(created.status).toBe('ACTIVE');
    expect(created.revision).toBe(1);
  });

  it('rechaza textos vacíos o de más de 300 caracteres', () => {
    expect(() => initiative('i1', '   ', 'p1')).toThrowError(DomainError);
    expect(() =>
      initiative('i1', 'a'.repeat(LIMITS.initiativeTextMax + 1), 'p1'),
    ).toThrowError(DomainError);
  });

  it('corrige solo el texto conservando autoría y originales', () => {
    const original = initiative('i1', 'Mejorar onboarding', 'p1');
    const corrected = correctInitiativeText(original, 'Mejorar el onboarding');

    expect(corrected.text).toBe('Mejorar el onboarding');
    expect(corrected.authorIds).toEqual(original.authorIds);
    expect(corrected.originals).toEqual(original.originals);
    expect(corrected.revision).toBe(2);
    expect(original.text).toBe('Mejorar onboarding');
  });

  it('fusiona múltiples propuestas conservando trazabilidad y autores', () => {
    const target = initiative('i1', 'Mejorar onboarding', 'p1');
    const second = initiative('i2', 'Onboarding más rápido', 'p2');
    const third = initiative('i3', 'Guiar al nuevo ingreso', 'p3');

    const result = fuseInitiatives({
      target,
      sources: [second, third],
      mergedText: 'Mejorar y acelerar el onboarding guiando al nuevo ingreso',
      now: '2026-11-14T11:00:00.000Z',
    });

    expect(result.consolidated.id).toBe('i1');
    expect(result.consolidated.authorIds).toEqual(['p1', 'p2', 'p3']);
    expect(result.consolidated.originals.map((item) => item.text)).toEqual([
      'Mejorar onboarding',
      'Onboarding más rápido',
      'Guiar al nuevo ingreso',
    ]);
    expect(result.consolidated.status).toBe('ACTIVE');
    expect(result.sources).toHaveLength(2);
    expect(
      result.sources.every(
        (source) => source.status === 'FUSED' && source.mergedIntoId === 'i1',
      ),
    ).toBe(true);
    expect(target.status).toBe('ACTIVE');
  });

  it('rechaza fusiones sin propuestas o con texto consolidado excesivo', () => {
    const target = initiative('i1', 'Uno', 'p1');

    expect(() =>
      fuseInitiatives({
        target,
        sources: [],
        mergedText: 'Dos',
        now,
      }),
    ).toThrowError(DomainError);

    expect(() =>
      fuseInitiatives({
        target,
        sources: [initiative('i2', 'Dos', 'p2')],
        mergedText: 'a'.repeat(LIMITS.initiativeTextMax + 1),
        now,
      }),
    ).toThrowError(DomainError);
  });

  it('crea y resuelve solicitudes anónimas de aclaración', () => {
    const request = createClarificationRequest({
      id: 'c1',
      initiativeId: 'i1',
      message: '¿Puedes precisar el alcance?',
      now,
    });

    expect(request.status).toBe('OPEN');
    expect(request.responseText).toBeNull();

    const resolved = respondToClarification(
      request,
      'Solo para nuevos ingresos',
    );

    expect(resolved.status).toBe('RESOLVED');
    expect(resolved.responseText).toBe('Solo para nuevos ingresos');
    expect(request.status).toBe('OPEN');
  });
});
