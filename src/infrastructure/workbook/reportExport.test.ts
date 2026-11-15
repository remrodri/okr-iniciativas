import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import type { SessionSnapshot } from '@/domain/ports';
import { exportSharedReport } from './reportExport';

const snapshot = {
  localId: 'local-1',
  sessionId: 'session-1',
  revision: 1,
  savedAt: '2026-11-15T10:00:00.000Z',
  formatVersion: 1,
  state: {
    session: {
      id: 'session-1', version: 1, stage: 'RESULTADO_FINAL', x0: 'Problema',
      xf: 'Solución', expectedParticipants: 2, initiativesPerParticipant: 1,
      finalistCount: 1, finalistIds: ['i-1'], tieBreak: null,
      iceConfig: { method: 'MULTIPLICATIVE', weights: null }, paused: false,
      createdAt: '2026-11-15T08:00:00.000Z', updatedAt: '2026-11-15T10:00:00.000Z',
    },
    participants: [
      { id: 'p-1', alias: 'Faro', realName: 'Ana', accessTokenId: 'secret-1', connected: false,
        progress: { brainstormingSubmitted: true, refinementSubmitted: true, tieBreakSubmitted: false, iceSubmitted: true } },
      { id: 'p-2', alias: 'Nexo', realName: 'Luis', accessTokenId: 'secret-2', connected: false,
        progress: { brainstormingSubmitted: true, refinementSubmitted: true, tieBreakSubmitted: false, iceSubmitted: true } },
    ],
    initiatives: [
      { id: 'i-1', text: 'Automatizar', authorIds: ['p-1'], originals: [], status: 'ACTIVE', mergedIntoId: null, revision: 1 },
      { id: 'i-2', text: 'Capacitar', authorIds: ['p-2'], originals: [], status: 'ACTIVE', mergedIntoId: null, revision: 1 },
    ],
    clarifications: [],
    ballots: [
      { id: 'b-1', participantId: 'p-1', round: 'REFINEMENT', selection: ['i-1'], submissionId: 'vote-private-1', submittedAt: '2026-11-15T09:00:00.000Z' },
      { id: 'b-2', participantId: 'p-2', round: 'REFINEMENT', selection: ['i-1'], submissionId: 'vote-private-2', submittedAt: '2026-11-15T09:00:00.000Z' },
    ],
    iceEvaluations: [
      { id: 'e-1', participantId: 'p-1', ratings: { 'i-1': { impact: 10, confidence: 9, ease: 8 } }, submissionId: 'ice-private-1', submittedAt: '2026-11-15T09:30:00.000Z' },
      { id: 'e-2', participantId: 'p-2', ratings: { 'i-1': { impact: 6, confidence: 5, ease: 4 } }, submissionId: 'ice-private-2', submittedAt: '2026-11-15T09:30:00.000Z' },
    ],
    ranking: [{ initiativeId: 'i-1', impactMedian: 8, confidenceMedian: 7, easeMedian: 6, score: 336, position: 1 }],
    audit: [],
  },
} as SessionSnapshot;

describe('exportSharedReport', () => {
  it('incluye resultados y autoría sin votos ni calificaciones individuales', async () => {
    const bytes = await exportSharedReport(snapshot);
    const input = new Uint8Array(bytes.byteLength); input.set(bytes);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(input.buffer);

    expect(workbook.worksheets.map(({ name }) => name)).toEqual([
      'Resumen', 'Participantes', 'Iniciativas', 'Depuración', 'ICE', 'Ranking',
    ]);
    const serialized = JSON.stringify(
      workbook.worksheets.map((sheet) =>
        Array.from({ length: sheet.rowCount }, (_, row) => sheet.getRow(row + 1).values),
      ),
    );
    expect(serialized).toContain('Ana');
    expect(serialized).toContain('Automatizar');
    expect(serialized).toContain('336');
    expect(serialized).not.toContain('vote-private');
    expect(serialized).not.toContain('ice-private');
    expect(serialized).not.toContain('secret-1');
    expect(workbook.getWorksheet('Depuración')?.getCell('C2').value).toBe(2);
    expect(workbook.getWorksheet('ICE')?.rowCount).toBe(2);
  });
});
