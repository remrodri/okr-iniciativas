import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';

import { SNAPSHOT_FORMAT_VERSION, type SessionSnapshot } from '@/domain/ports';
import { InMemorySessionRepository } from '@/infrastructure/browser-storage/memorySessionRepository';
import { exportBackupWorkbook } from './backupExport';
import { importBackupWorkbook } from './backupImport';

function snapshot(localId = 'active'): SessionSnapshot {
  return {
    localId,
    sessionId: 'session-1',
    revision: 5,
    savedAt: '2026-11-15T10:00:00.000Z',
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    state: {
      session: {
        id: 'session-1',
        version: 5,
        stage: 'RESULTADO_FINAL',
        x0: 'Problema',
        xf: 'Solución',
        expectedParticipants: 1,
        initiativesPerParticipant: 1,
        finalistCount: 1,
        finalistIds: ['i-1'],
        tieBreak: null,
        iceConfig: {
          method: 'WEIGHTED',
          weights: { impact: 50, confidence: 25, ease: 25 },
        },
        paused: false,
        createdAt: '2026-11-15T08:00:00.000Z',
        updatedAt: '2026-11-15T10:00:00.000Z',
      },
      participants: [
        {
          id: 'p-1',
          alias: 'Faro',
          realName: 'Ana',
          accessTokenId: 'historical-id',
          progress: {
            brainstormingSubmitted: true,
            refinementSubmitted: true,
            tieBreakSubmitted: false,
            iceSubmitted: true,
          },
          connected: false,
        },
      ],
      initiatives: [
        {
          id: 'i-1',
          text: 'Automatizar el registro',
          authorIds: ['p-1'],
          originals: [
            {
              id: 'original-1',
              text: 'Automatizar registros',
              authorId: 'p-1',
              fusedAt: '2026-11-15T09:00:00.000Z',
            },
          ],
          status: 'ACTIVE',
          mergedIntoId: null,
          revision: 2,
        },
      ],
      clarifications: [
        {
          id: 'clarification-1',
          initiativeId: 'i-1',
          message: 'Aclara el alcance',
          status: 'RESOLVED',
          createdAt: '2026-11-15T08:30:00.000Z',
          responseText: 'Incluye el registro diario',
        },
      ],
      ballots: [
        {
          id: 'ballot-1',
          participantId: 'p-1',
          round: 'REFINEMENT',
          selection: ['i-1'],
          submissionId: 'submission-1',
          submittedAt: '2026-11-15T09:20:00.000Z',
        },
      ],
      iceEvaluations: [
        {
          id: 'evaluation-1',
          participantId: 'p-1',
          ratings: { 'i-1': { impact: 8, confidence: 7, ease: 6 } },
          submissionId: 'ice-1',
          submittedAt: '2026-11-15T09:40:00.000Z',
        },
      ],
      ranking: [
        {
          initiativeId: 'i-1',
          impactMedian: 8,
          confidenceMedian: 7,
          easeMedian: 6,
          score: 7.25,
          position: 1,
        },
      ],
      audit: [
        {
          id: 'event-1',
          actorId: 'facilitator',
          actorRole: 'FACILITATOR',
          action: 'RESULTS_PUBLISHED',
          fromStage: 'EVALUACION_ICE',
          toStage: 'RESULTADO_FINAL',
          at: '2026-11-15T10:00:00.000Z',
          details: { complete: true, participants: 1, note: 'final' },
        },
      ],
    },
  };
}

async function changedWorkbook(
  bytes: Uint8Array,
  change: (workbook: ExcelJS.Workbook) => void,
): Promise<Uint8Array> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(input.buffer);
  change(workbook);
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}

describe('importBackupWorkbook', () => {
  it('conserva el estado en un round-trip y crea una copia preventiva', async () => {
    const original = snapshot();
    const bytes = await exportBackupWorkbook(original, {
      backupId: 'round-trip',
      now: () => new Date('2026-11-15T10:30:00.000Z'),
    });
    const repository = new InMemorySessionRepository();
    await repository.save(original);

    const result = await importBackupWorkbook(bytes, {
      repository,
      activeSnapshot: original,
    });

    expect(result.snapshot.state).toEqual(original.state);
    expect(await repository.get(result.snapshot.localId)).toEqual(result.snapshot);
    expect(await repository.get(result.preventiveCopyId!)).toEqual({
      ...original,
      localId: result.preventiveCopyId,
    });
  });

  it.each([
    {
      name: 'versión incompatible',
      alter: (workbook: ExcelJS.Workbook) => {
        workbook.getWorksheet('Metadata')!.getCell('A2').value = 99;
      },
    },
    {
      name: 'contenido alterado',
      alter: (workbook: ExcelJS.Workbook) => {
        workbook.getWorksheet('Session')!.getCell('D2').value = 'Manipulado';
      },
    },
  ])('rechaza $name sin modificar el repositorio', async ({ alter }) => {
    const original = snapshot();
    const valid = await exportBackupWorkbook(original, { backupId: 'invalid' });
    const invalid = await changedWorkbook(valid, alter);
    const repository = new InMemorySessionRepository();
    await repository.save(original);
    const save = vi.spyOn(repository, 'save');

    await expect(
      importBackupWorkbook(invalid, { repository, activeSnapshot: original }),
    ).rejects.toThrow();

    expect(save).not.toHaveBeenCalled();
    expect(await repository.count()).toBe(1);
    expect(await repository.get(original.localId)).toEqual(original);
  });
});
