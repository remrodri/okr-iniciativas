import { describe, expect, it } from 'vitest';

import { createBallot, submitBallot } from './ballots';
import { DomainError } from './errors';

const now = '2026-11-14T10:00:00.000Z';
const availableIds = ['i1', 'i2', 'i3', 'i4', 'i5'];

function ballot(selection: string[], overrides: Partial<{ submissionId: string }> = {}) {
  return createBallot({
    id: 'b1',
    participantId: 'p1',
    round: 'REFINEMENT',
    selection,
    availableIds,
    requiredCount: 2,
    submissionId: overrides.submissionId ?? 'sub-1',
    now,
  });
}

describe('ballots de depuración', () => {
  it('acepta exactamente N selecciones únicas', () => {
    const created = ballot(['i1', 'i3']);

    expect(created.selection).toEqual(['i1', 'i3']);
    expect(created.round).toBe('REFINEMENT');
  });

  it('rechaza selecciones incompletas o excedentes', () => {
    expect(() => ballot(['i1'])).toThrowError(DomainError);
    expect(() => ballot(['i1', 'i2', 'i3'])).toThrowError(DomainError);
  });

  it('rechaza selecciones duplicadas o desconocidas', () => {
    expect(() => ballot(['i1', 'i1'])).toThrowError(DomainError);
    expect(() => ballot(['i1', 'i9'])).toThrowError(DomainError);
  });

  it('un reenvío con el mismo submissionId es idempotente', () => {
    const first = ballot(['i1', 'i2']);
    const created = submitBallot([], first);
    const repeated = submitBallot(created.ballots, ballot(['i1', 'i2']));

    expect(created.status).toBe('CREATED');
    expect(repeated.status).toBe('DUPLICATE');
    expect(repeated.ballots).toHaveLength(1);
  });

  it('rechaza un envío nuevo del mismo participante o un conflicto', () => {
    const existing = submitBallot([], ballot(['i1', 'i2'])).ballots;

    expect(() =>
      submitBallot(
        existing,
        createBallot({
          id: 'b2',
          participantId: 'p1',
          round: 'REFINEMENT',
          selection: ['i1', 'i2'],
          availableIds,
          requiredCount: 2,
          submissionId: 'sub-2',
          now,
        }),
      ),
    ).toThrowError(DomainError);

    expect(() =>
      submitBallot(existing, ballot(['i3', 'i4'], { submissionId: 'sub-1' })),
    ).toThrowError(DomainError);
  });

  it('permite el mismo participante en otra ronda', () => {
    const existing = submitBallot([], ballot(['i1', 'i2'])).ballots;
    const tieBreak = createBallot({
      id: 'b2',
      participantId: 'p1',
      round: 'TIEBREAK',
      selection: ['i3'],
      availableIds,
      requiredCount: 1,
      submissionId: 'sub-3',
      now,
    });

    const result = submitBallot(existing, tieBreak);
    expect(result.ballots).toHaveLength(2);
  });
});
