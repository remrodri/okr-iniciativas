import { describe, expect, it } from 'vitest';

import { evaluateEarlyClose } from './earlyClose';

const now = '2026-11-14T10:00:00.000Z';

function submission(id: string, complete: boolean) {
  return { id, participantId: `p-${id}`, complete };
}

describe('cierre anticipado', () => {
  it('no permite cerrar con 0 respuestas completas', () => {
    const result = evaluateEarlyClose({
      submissions: [],
      round: 'REFINEMENT',
      actorId: 'facilitator-1',
      auditId: 'audit-1',
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.completeSubmissionIds).toEqual([]);
    expect(result.discardedPartialIds).toEqual([]);
  });

  it('no permite cerrar con una sola respuesta completa aunque haya parciales', () => {
    const result = evaluateEarlyClose({
      submissions: [submission('s1', true), submission('s2', false)],
      round: 'REFINEMENT',
      actorId: 'facilitator-1',
      auditId: 'audit-1',
      now,
    });

    expect(result.allowed).toBe(false);
    expect(result.completeSubmissionIds).toEqual(['s1']);
    expect(result.discardedPartialIds).toEqual(['s2']);
  });

  it('permite cerrar con dos completas y descarta las parciales', () => {
    const result = evaluateEarlyClose({
      submissions: [
        submission('s1', true),
        submission('s2', false),
        submission('s3', true),
        submission('s4', false),
      ],
      round: 'ICE',
      actorId: 'facilitator-1',
      auditId: 'audit-1',
      now,
    });

    expect(result.allowed).toBe(true);
    expect(result.completeSubmissionIds).toEqual(['s1', 's3']);
    expect(result.discardedPartialIds).toEqual(['s2', 's4']);
    expect(result.audit).toMatchObject({
      actorId: 'facilitator-1',
      action: 'EARLY_CLOSE_ICE',
      details: {
        incompleteParticipation: true,
        discardedPartials: 2,
        completeSubmissions: 2,
      },
    });
  });

  it('permite cerrar con más de dos completas y sin parciales', () => {
    const result = evaluateEarlyClose({
      submissions: [
        submission('s1', true),
        submission('s2', true),
        submission('s3', true),
      ],
      round: 'REFINEMENT',
      actorId: 'facilitator-1',
      auditId: 'audit-1',
      now,
    });

    expect(result.allowed).toBe(true);
    expect(result.discardedPartialIds).toEqual([]);
    expect(result.audit.details).toMatchObject({
      incompleteParticipation: false,
      completeSubmissions: 3,
    });
  });
});
