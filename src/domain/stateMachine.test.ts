import { describe, expect, it } from 'vitest';

import { DomainError } from './errors';
import { applyStageAction, type StageAction } from './stateMachine';
import type { Session, SessionStage } from './types';

const now = '2026-11-14T10:00:00.000Z';

function makeSession(stage: SessionStage): Session {
  return {
    id: 's1',
    version: 1,
    stage,
    x0: 'X0',
    xf: 'Xf',
    expectedParticipants: 6,
    initiativesPerParticipant: 5,
    finalistCount: null,
    iceConfig: null,
    paused: false,
    createdAt: now,
    updatedAt: now,
  };
}

function apply(stage: SessionStage, action: StageAction) {
  return applyStageAction({
    session: makeSession(stage),
    action,
    actorId: 'facilitator-1',
    actorRole: 'FACILITATOR',
    now,
    auditId: 'audit-1',
  });
}

describe('máquina de estados', () => {
  it.each([
    ['CONFIGURACION', 'OPEN_WAITING_ROOM', 'SALA_DE_ESPERA'],
    ['SALA_DE_ESPERA', 'OPEN_BRAINSTORMING', 'BRAINSTORMING'],
    ['BRAINSTORMING', 'CLOSE_BRAINSTORMING', 'REVISION'],
    ['REVISION', 'OPEN_REFINEMENT', 'DEPURACION'],
    ['REVISION', 'OPEN_ICE_CONFIG', 'CONFIGURACION_ICE'],
    ['DEPURACION', 'OPEN_TIEBREAK', 'DESEMPATE_DEPURACION'],
    ['DEPURACION', 'OPEN_ICE_CONFIG', 'CONFIGURACION_ICE'],
    ['DESEMPATE_DEPURACION', 'OPEN_ICE_CONFIG', 'CONFIGURACION_ICE'],
    ['CONFIGURACION_ICE', 'OPEN_ICE_EVALUATION', 'EVALUACION_ICE'],
    ['EVALUACION_ICE', 'PUBLISH_RESULTS', 'RESULTADO_FINAL'],
    ['RESULTADO_FINAL', 'FINALIZE', 'FINALIZADA'],
    ['FINALIZADA', 'REOPEN', 'RESULTADO_FINAL'],
  ] as const)(
    'permite %s --%s--> %s',
    (from, action, to) => {
      const result = apply(from, action);

      expect(result.session.stage).toBe(to);
      expect(result.session.version).toBe(2);
      expect(result.session.updatedAt).toBe(now);
      expect(result.audit).toMatchObject({
        action,
        fromStage: from,
        toStage: to,
        actorRole: 'FACILITATOR',
        at: now,
      });
    },
  );

  it.each([
    ['CONFIGURACION', 'OPEN_BRAINSTORMING'],
    ['SALA_DE_ESPERA', 'OPEN_REFINEMENT'],
    ['BRAINSTORMING', 'OPEN_ICE_CONFIG'],
    ['REVISION', 'OPEN_TIEBREAK'],
    ['DEPURACION', 'PUBLISH_RESULTS'],
    ['CONFIGURACION_ICE', 'OPEN_REFINEMENT'],
    ['EVALUACION_ICE', 'FINALIZE'],
    ['RESULTADO_FINAL', 'REOPEN'],
    ['FINALIZADA', 'OPEN_ICE_CONFIG'],
  ] as const)('rechaza %s --%s-->', (from, action) => {
    expect(() => apply(from, action)).toThrowError(DomainError);
    try {
      apply(from, action);
    } catch (error) {
      expect((error as DomainError).code).toBe('INVALID_STAGE_TRANSITION');
    }
  });

  it('solo el facilitador cambia de etapa', () => {
    expect(() =>
      applyStageAction({
        session: makeSession('SALA_DE_ESPERA'),
        action: 'OPEN_BRAINSTORMING',
        actorId: 'participant-1',
        actorRole: 'PARTICIPANT',
        now,
        auditId: 'audit-2',
      }),
    ).toThrowError(DomainError);
  });

  it('no muta la sesión de entrada', () => {
    const session = makeSession('CONFIGURACION');
    applyStageAction({
      session,
      action: 'OPEN_WAITING_ROOM',
      actorId: 'facilitator-1',
      actorRole: 'FACILITATOR',
      now,
      auditId: 'audit-3',
    });

    expect(session.stage).toBe('CONFIGURACION');
    expect(session.version).toBe(1);
  });
});
