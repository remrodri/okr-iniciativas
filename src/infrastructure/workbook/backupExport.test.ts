import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import type { SessionSnapshot } from '@/domain/ports';
import { exportBackupWorkbook } from './backupExport';
import { BACKUP_APPLICATION, BACKUP_FORMAT_VERSION, BACKUP_SHEETS } from './workbookSchema';

function maximumSnapshot(): SessionSnapshot {
  const participants = Array.from({ length: 40 }, (_, index) => ({
    id: `p-${index + 1}`,
    alias: `Alias ${index + 1}`,
    realName: `Persona ${index + 1}`,
    accessTokenId: `access-${index + 1}`,
    progress: {
      brainstormingSubmitted: true,
      refinementSubmitted: true,
      tieBreakSubmitted: false,
      iceSubmitted: true,
    },
    connected: false,
  }));
  const initiatives = Array.from({ length: 400 }, (_, index) => ({
    id: `i-${index + 1}`,
    text: `Iniciativa ${index + 1}`,
    authorIds: [`p-${(index % 40) + 1}`],
    originals: [],
    status: 'ACTIVE' as const,
    mergedIntoId: null,
    revision: 1,
  }));
  const finalistIds = initiatives.slice(0, 40).map(({ id }) => id);
  return {
    localId: 'local-maximum',
    sessionId: 'session-maximum',
    revision: 8,
    savedAt: '2026-11-15T12:00:00.000Z',
    formatVersion: 1,
    state: {
      session: {
        id: 'session-maximum',
        version: 8,
        stage: 'RESULTADO_FINAL',
        x0: 'Situación actual',
        xf: 'Situación deseada',
        expectedParticipants: 40,
        initiativesPerParticipant: 10,
        finalistCount: 40,
        finalistIds,
        tieBreak: null,
        iceConfig: { method: 'MULTIPLICATIVE', weights: null },
        paused: false,
        createdAt: '2026-11-15T08:00:00.000Z',
        updatedAt: '2026-11-15T12:00:00.000Z',
      },
      participants,
      initiatives,
      clarifications: [],
      ballots: participants.map((participant) => ({
        id: `ballot-${participant.id}`,
        participantId: participant.id,
        round: 'REFINEMENT' as const,
        selection: finalistIds,
        submissionId: `submission-${participant.id}`,
        submittedAt: '2026-11-15T10:00:00.000Z',
      })),
      iceEvaluations: participants.map((participant) => ({
        id: `evaluation-${participant.id}`,
        participantId: participant.id,
        ratings: Object.fromEntries(
          finalistIds.map((initiativeId) => [
            initiativeId,
            { impact: 8, confidence: 7, ease: 6 },
          ]),
        ),
        submissionId: `ice-${participant.id}`,
        submittedAt: '2026-11-15T11:00:00.000Z',
      })),
      ranking: finalistIds.map((initiativeId, index) => ({
        initiativeId,
        impactMedian: 8,
        confidenceMedian: 7,
        easeMedian: 6,
        score: 336,
        position: index + 1,
      })),
      audit: [],
    },
  };
}

describe('exportBackupWorkbook', () => {
  it('genera un libro restaurable con todas las hojas y conteos máximos', async () => {
    const progress: number[] = [];
    const bytes = await exportBackupWorkbook(maximumSnapshot(), {
      now: () => new Date('2026-11-15T12:30:00.000Z'),
      backupId: 'backup-maximum',
      onProgress: (value) => progress.push(value),
    });

    const workbook = new ExcelJS.Workbook();
    const workbookBytes = new Uint8Array(bytes.byteLength);
    workbookBytes.set(bytes);
    await workbook.xlsx.load(workbookBytes.buffer);

    expect(workbook.worksheets.map(({ name }) => name)).toEqual(
      Object.keys(BACKUP_SHEETS),
    );
    const metadata = workbook.getWorksheet('Metadata');
    expect(metadata?.getCell('A2').value).toBe(BACKUP_FORMAT_VERSION);
    expect(metadata?.getCell('B2').value).toBe(BACKUP_APPLICATION);
    expect(metadata?.getCell('E2').value).toMatch(/^[a-f0-9]{64}$/);
    expect(workbook.getWorksheet('Participants')?.rowCount).toBe(41);
    expect(workbook.getWorksheet('Initiatives')?.rowCount).toBe(401);
    expect(workbook.getWorksheet('Votes')?.rowCount).toBe(1_601);
    expect(workbook.getWorksheet('IceRatings')?.rowCount).toBe(1_601);
    expect(workbook.getWorksheet('Results')?.rowCount).toBe(41);
    expect(progress[0]).toBe(0);
    expect(progress.at(-1)).toBe(100);
  });
});
