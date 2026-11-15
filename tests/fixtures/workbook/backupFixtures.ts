import type { NormalizedBackup } from '@/infrastructure/workbook/workbookSchema';

export function validBackupFixture(): NormalizedBackup {
  return {
    Metadata: [
      {
        formatVersion: 1,
        application: 'okr-iniciativas',
        backupId: 'backup-1',
        exportedAt: '2026-11-15T00:00:00.000Z',
        checksum: 'pending-checksum',
      },
    ],
    Session: [
      {
        id: 'session-1',
        version: 7,
        stage: 'RESULTADO_FINAL',
        x0: 'Situación actual',
        xf: 'Situación deseada',
        expectedParticipants: 2,
        initiativesPerParticipant: 1,
        finalistCount: 1,
        iceMethod: 'MULTIPLICATIVE',
        weightImpact: null,
        weightConfidence: null,
        weightEase: null,
        paused: false,
        createdAt: '2026-11-14T10:00:00.000Z',
        updatedAt: '2026-11-14T11:00:00.000Z',
        finalizedAt: null,
        expiresAt: null,
      },
    ],
    Participants: [
      {
        id: 'p1',
        alias: 'Faro',
        realName: 'Ana',
        accessTokenId: 'opaque-token-id',
        brainstormingSubmitted: true,
        refinementSubmitted: true,
        tieBreakSubmitted: false,
        iceSubmitted: true,
        connected: false,
      },
    ],
    Initiatives: [
      {
        id: 'i1',
        text: 'Mejorar onboarding',
        status: 'ACTIVE',
        mergedIntoId: null,
        revision: 1,
      },
    ],
    Refinements: [
      {
        recordId: 'author-i1-p1',
        kind: 'AUTHOR',
        initiativeId: 'i1',
        relatedId: 'p1',
        text: null,
        numericValue: null,
        createdAt: null,
        status: null,
        responseText: null,
      },
    ],
    Votes: [
      {
        ballotId: 'p1_REFINEMENT',
        participantId: 'p1',
        round: 'REFINEMENT',
        selectedInitiativeId: 'i1',
        selectionOrder: 1,
        submissionId: 'vote-submission',
        submittedAt: '2026-11-14T10:30:00.000Z',
      },
    ],
    IceRatings: [
      {
        evaluationId: 'p1',
        participantId: 'p1',
        initiativeId: 'i1',
        impact: 8,
        confidence: 7,
        ease: 6,
        submissionId: 'ice-submission',
        submittedAt: '2026-11-14T10:45:00.000Z',
      },
    ],
    Results: [
      {
        initiativeId: 'i1',
        impactMedian: 8,
        confidenceMedian: 7,
        easeMedian: 6,
        score: 336,
        position: 1,
      },
    ],
    Audit: [
      {
        eventId: 'event-1',
        actorId: 'system',
        actorRole: 'SYSTEM',
        action: 'SESSION_CREATED',
        fromStage: null,
        toStage: 'CONFIGURACION',
        at: '2026-11-14T10:00:00.000Z',
        detailKey: 'participants',
        detailValue: '2',
      },
    ],
  };
}

export function invalidBackupFixtures(): readonly {
  readonly name: string;
  readonly manifest: unknown;
}[] {
  const missingSheet = structuredClone(validBackupFixture()) as unknown as Record<
    string,
    unknown
  >;
  delete missingSheet.Votes;
  const wrongVersion = structuredClone(validBackupFixture());
  wrongVersion.Metadata[0]!.formatVersion = 99;
  const wrongType = structuredClone(validBackupFixture());
  (wrongType.Session[0] as unknown as Record<string, unknown>).paused = 'no';
  const extraSheet = {
    ...structuredClone(validBackupFixture()),
    Secrets: [{ token: 'raw-secret' }],
  };
  return [
    { name: 'una hoja obligatoria ausente', manifest: missingSheet },
    { name: 'una versión incompatible', manifest: wrongVersion },
    { name: 'un tipo de celda incorrecto', manifest: wrongType },
    { name: 'una hoja no declarada', manifest: extraSheet },
  ];
}
