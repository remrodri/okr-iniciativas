import { describe, expect, it } from 'vitest';

import { decideTie, resolveRefinement } from './finalists';
import { DomainError } from './errors';
import type { RefinementBallot } from './types';

const now = '2026-11-14T10:00:00.000Z';

function ballot(
  participantId: string,
  selection: string[],
  round: 'REFINEMENT' | 'TIEBREAK' = 'REFINEMENT',
): RefinementBallot {
  return {
    id: `b-${participantId}-${round}`,
    participantId,
    round,
    selection,
    submissionId: `sub-${participantId}-${round}`,
    submittedAt: now,
  };
}

describe('selección de finalistas', () => {
  it('corta sin empate por votos descendentes', () => {
    const result = resolveRefinement({
      initiativeIds: ['i1', 'i2', 'i3'],
      ballots: [
        ballot('p1', ['i1', 'i2']),
        ballot('p2', ['i1', 'i3']),
        ballot('p3', ['i1', 'i2']),
      ],
      finalistCount: 2,
    });

    expect(result.finalists).toEqual(['i1', 'i2']);
    expect(result.tie).toBeNull();
  });

  it('detecta empate parcial en el puesto N y calcula puestos restantes', () => {
    const result = resolveRefinement({
      initiativeIds: ['i1', 'i2', 'i3', 'i4'],
      ballots: [
        ballot('p1', ['i1', 'i2']),
        ballot('p2', ['i1', 'i3']),
        ballot('p3', ['i1', 'i4']),
      ],
      finalistCount: 2,
    });

    expect(result.finalists).toEqual(['i1']);
    expect(result.tie).toEqual({
      candidateIds: ['i2', 'i3', 'i4'],
      slotsRemaining: 1,
    });
  });

  it('incluye a todas cuando N iguala las disponibles', () => {
    const result = resolveRefinement({
      initiativeIds: ['i1', 'i2'],
      ballots: [ballot('p1', ['i1', 'i2'])],
      finalistCount: 2,
    });

    expect(result.finalists).toEqual(['i1', 'i2']);
    expect(result.tie).toBeNull();
  });

  it('ignora ballots de desempate al contar la depuración', () => {
    const result = resolveRefinement({
      initiativeIds: ['i1', 'i2', 'i3'],
      ballots: [
        ballot('p1', ['i1', 'i2']),
        ballot('p2', ['i1']),
        ballot('p3', ['i2', 'i3'], 'TIEBREAK'),
      ],
      finalistCount: 1,
    });

    expect(result.finalists).toEqual(['i1']);
    expect(result.tie).toBeNull();
  });

  it('registra la decisión del facilitador ante un empate persistente', () => {
    const result = resolveRefinement({
      initiativeIds: ['i1', 'i2', 'i3'],
      ballots: [
        ballot('p1', ['i1', 'i2']),
        ballot('p2', ['i1', 'i3']),
      ],
      finalistCount: 2,
    });

    expect(result.tie).not.toBeNull();
    if (result.tie === null) {
      throw new Error('Se esperaba un empate.');
    }

    const decided = decideTie({
      tie: result.tie,
      selectedIds: ['i3'],
      actorId: 'facilitator-1',
      auditId: 'audit-1',
      now,
    });

    expect(decided.selected).toEqual(['i3']);
    expect(decided.audit.action).toBe('TIE_DECISION');
    expect(decided.audit.details).toMatchObject({ selectedIds: 'i3' });
  });

  it('rechaza decisiones con cantidad o miembros inválidos', () => {
    expect(() =>
      decideTie({
        tie: { candidateIds: ['i2', 'i3'], slotsRemaining: 1 },
        selectedIds: ['i2', 'i3'],
        actorId: 'facilitator-1',
        auditId: 'audit-1',
        now,
      }),
    ).toThrowError(DomainError);

    expect(() =>
      decideTie({
        tie: { candidateIds: ['i2', 'i3'], slotsRemaining: 1 },
        selectedIds: ['i9'],
        actorId: 'facilitator-1',
        auditId: 'audit-1',
        now,
      }),
    ).toThrowError(DomainError);
  });
});
