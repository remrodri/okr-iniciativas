import type ExcelJS from 'exceljs';

import { LIMITS } from '@/domain/limits';
import {
  SNAPSHOT_FORMAT_VERSION,
  type SessionRepository,
  type SessionSnapshot,
} from '@/domain/ports';
import type {
  ActorRole,
  BallotRound,
  ClarificationStatus,
  IceMethod,
  IceScores,
  InitiativeOriginal,
  SessionStage,
} from '@/domain/types';
import { calculateBackupChecksum } from './backupManifest';
import {
  BACKUP_SHEETS,
  type BackupSheetName,
  type NormalizedBackup,
  validateBackupManifest,
} from './workbookSchema';

type BackupRow = Record<string, string | number | boolean | null>;

export interface BackupImportOptions {
  readonly repository: SessionRepository;
  readonly activeSnapshot?: SessionSnapshot | null;
}

export interface BackupImportResult {
  readonly snapshot: SessionSnapshot;
  readonly preventiveCopyId: string | null;
}

function cellValue(cell: ExcelJS.Cell): string | number | boolean | null {
  const { value } = cell;
  if (value === null) return null;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  throw new Error('El respaldo contiene celdas calculadas o no admitidas.');
}

async function readManifest(bytes: Uint8Array): Promise<NormalizedBackup> {
  const input = new Uint8Array(bytes.byteLength);
  input.set(bytes);
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  try {
    await workbook.xlsx.load(input.buffer);
  } catch {
    throw new Error('El archivo no es un respaldo Excel válido.');
  }

  const expectedNames = Object.keys(BACKUP_SHEETS) as BackupSheetName[];
  if (
    workbook.worksheets.length !== expectedNames.length ||
    workbook.worksheets.some((sheet, index) => sheet.name !== expectedNames[index])
  ) {
    throw new Error('Las hojas del respaldo no coinciden con el formato esperado.');
  }

  const rawManifest: Record<string, BackupRow[]> = {};
  for (const sheetName of expectedNames) {
    const worksheet = workbook.getWorksheet(sheetName);
    if (worksheet === undefined) {
      throw new Error(`Falta la hoja obligatoria ${sheetName}.`);
    }
    const schema = BACKUP_SHEETS[sheetName];
    schema.columns.forEach((column, index) => {
      if (worksheet.getCell(1, index + 1).value !== column.key) {
        throw new Error(`Los encabezados de ${sheetName} fueron modificados.`);
      }
    });
    if (worksheet.columnCount !== schema.columns.length) {
      throw new Error(`La hoja ${sheetName} contiene columnas inesperadas.`);
    }

    const rows: BackupRow[] = [];
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
      const row: BackupRow = {};
      schema.columns.forEach((column, columnIndex) => {
        row[column.key] = cellValue(
          worksheet.getCell(rowIndex, columnIndex + 1),
        );
      });
      rows.push(row);
    }
    rawManifest[sheetName] = rows;
  }

  const manifest = validateBackupManifest(rawManifest);
  const expectedChecksum = manifest.Metadata[0]!.checksum;
  const actualChecksum = await calculateBackupChecksum(manifest);
  if (expectedChecksum !== actualChecksum) {
    throw new Error('El respaldo fue modificado o está corrupto.');
  }
  return manifest;
}

function value<T extends string | number | boolean>(
  row: BackupRow,
  key: string,
): T {
  return row[key] as T;
}

function parseDetail(valueToParse: string): string | number | boolean {
  try {
    const parsed: unknown = JSON.parse(valueToParse);
    if (
      typeof parsed === 'string' ||
      typeof parsed === 'number' ||
      typeof parsed === 'boolean'
    ) {
      return parsed;
    }
  } catch {
    // Compatibilidad con respaldos v1 que guardaron texto sin serializar.
  }
  return valueToParse;
}

function manifestToSnapshot(manifest: NormalizedBackup): SessionSnapshot {
  const metadata = manifest.Metadata[0]!;
  const sessionRow = manifest.Session[0]!;
  const refinementRows = manifest.Refinements;
  const finalistIds = refinementRows
    .filter((row) => row.kind === 'FINALIST')
    .sort(
      (left, right) =>
        value<number>(left, 'numericValue') - value<number>(right, 'numericValue'),
    )
    .map((row) => value<string>(row, 'initiativeId'));
  const tieRows = refinementRows.filter((row) => row.kind === 'TIE_CANDIDATE');

  const authorIds = new Map<string, string[]>();
  const originals = new Map<string, InitiativeOriginal[]>();
  for (const row of refinementRows) {
    const initiativeId = value<string>(row, 'initiativeId');
    if (row.kind === 'AUTHOR') {
      const authors = authorIds.get(initiativeId) ?? [];
      authors.push(value<string>(row, 'relatedId'));
      authorIds.set(initiativeId, authors);
    }
    if (row.kind === 'ORIGINAL') {
      const items = originals.get(initiativeId) ?? [];
      items.push({
        id: value<string>(row, 'recordId').replace(/^original-/, ''),
        text: value<string>(row, 'text'),
        authorId: value<string>(row, 'relatedId'),
        fusedAt: value<string>(row, 'createdAt'),
      });
      originals.set(initiativeId, items);
    }
  }

  const ballotsById = new Map<string, typeof manifest.Votes>();
  for (const row of manifest.Votes) {
    const ballotId = value<string>(row, 'ballotId');
    const rows = ballotsById.get(ballotId) ?? [];
    rows.push(row);
    ballotsById.set(ballotId, rows);
  }
  const evaluationsById = new Map<string, typeof manifest.IceRatings>();
  for (const row of manifest.IceRatings) {
    const evaluationId = value<string>(row, 'evaluationId');
    const rows = evaluationsById.get(evaluationId) ?? [];
    rows.push(row);
    evaluationsById.set(evaluationId, rows);
  }
  const auditById = new Map<string, typeof manifest.Audit>();
  for (const row of manifest.Audit) {
    const eventId = value<string>(row, 'eventId');
    const rows = auditById.get(eventId) ?? [];
    rows.push(row);
    auditById.set(eventId, rows);
  }

  const iceMethod = sessionRow.iceMethod as IceMethod | null;
  const backupId = value<string>(metadata, 'backupId');
  return {
    localId: `import-${backupId}`,
    sessionId: value<string>(sessionRow, 'id'),
    revision: value<number>(sessionRow, 'version'),
    savedAt: value<string>(metadata, 'exportedAt'),
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    state: {
      session: {
        id: value<string>(sessionRow, 'id'),
        version: value<number>(sessionRow, 'version'),
        stage: value<SessionStage>(sessionRow, 'stage'),
        x0: value<string>(sessionRow, 'x0'),
        xf: value<string>(sessionRow, 'xf'),
        expectedParticipants: value<number>(sessionRow, 'expectedParticipants'),
        initiativesPerParticipant: value<number>(
          sessionRow,
          'initiativesPerParticipant',
        ),
        finalistCount: sessionRow.finalistCount as number | null,
        finalistIds,
        tieBreak:
          tieRows.length === 0
            ? null
            : {
                candidateIds: tieRows.map((row) =>
                  value<string>(row, 'initiativeId'),
                ),
                slotsRemaining: value<number>(tieRows[0]!, 'numericValue'),
              },
        iceConfig:
          iceMethod === null
            ? null
            : {
                method: iceMethod,
                weights:
                  iceMethod === 'WEIGHTED'
                    ? {
                        impact: value<number>(sessionRow, 'weightImpact'),
                        confidence: value<number>(sessionRow, 'weightConfidence'),
                        ease: value<number>(sessionRow, 'weightEase'),
                      }
                    : null,
              },
        paused: value<boolean>(sessionRow, 'paused'),
        createdAt: value<string>(sessionRow, 'createdAt'),
        updatedAt: value<string>(sessionRow, 'updatedAt'),
        ...(typeof sessionRow.finalizedAt === 'string'
          ? { finalizedAt: sessionRow.finalizedAt }
          : {}),
        ...(typeof sessionRow.expiresAt === 'string'
          ? { expiresAt: sessionRow.expiresAt }
          : {}),
      },
      participants: manifest.Participants.map((row) => ({
        id: value<string>(row, 'id'),
        alias: value<string>(row, 'alias'),
        realName: value<string>(row, 'realName'),
        accessTokenId: value<string>(row, 'accessTokenId'),
        progress: {
          brainstormingSubmitted: value<boolean>(row, 'brainstormingSubmitted'),
          refinementSubmitted: value<boolean>(row, 'refinementSubmitted'),
          tieBreakSubmitted: value<boolean>(row, 'tieBreakSubmitted'),
          iceSubmitted: value<boolean>(row, 'iceSubmitted'),
        },
        connected: value<boolean>(row, 'connected'),
      })),
      initiatives: manifest.Initiatives.map((row) => {
        const id = value<string>(row, 'id');
        return {
          id,
          text: value<string>(row, 'text'),
          authorIds: authorIds.get(id) ?? [],
          originals: originals.get(id) ?? [],
          status: value<'ACTIVE' | 'FUSED'>(row, 'status'),
          mergedIntoId: row.mergedIntoId as string | null,
          revision: value<number>(row, 'revision'),
        };
      }),
      clarifications: refinementRows
        .filter((row) => row.kind === 'CLARIFICATION')
        .map((row) => ({
          id: value<string>(row, 'recordId'),
          initiativeId: value<string>(row, 'initiativeId'),
          message: value<string>(row, 'text'),
          status: value<ClarificationStatus>(row, 'status'),
          createdAt: value<string>(row, 'createdAt'),
          responseText: row.responseText as string | null,
        })),
      ballots: [...ballotsById.values()].map((rows) => {
        const first = rows[0]!;
        return {
          id: value<string>(first, 'ballotId'),
          participantId: value<string>(first, 'participantId'),
          round: value<BallotRound>(first, 'round'),
          selection: [...rows]
            .sort(
              (left, right) =>
                value<number>(left, 'selectionOrder') -
                value<number>(right, 'selectionOrder'),
            )
            .map((row) => value<string>(row, 'selectedInitiativeId')),
          submissionId: value<string>(first, 'submissionId'),
          submittedAt: value<string>(first, 'submittedAt'),
        };
      }),
      iceEvaluations: [...evaluationsById.values()].map((rows) => {
        const first = rows[0]!;
        const ratings: Record<string, IceScores> = {};
        rows.forEach((row) => {
          ratings[value<string>(row, 'initiativeId')] = {
            impact: value<number>(row, 'impact'),
            confidence: value<number>(row, 'confidence'),
            ease: value<number>(row, 'ease'),
          };
        });
        return {
          id: value<string>(first, 'evaluationId'),
          participantId: value<string>(first, 'participantId'),
          ratings,
          submissionId: value<string>(first, 'submissionId'),
          submittedAt: value<string>(first, 'submittedAt'),
        };
      }),
      ranking: manifest.Results.map((row) => ({
        initiativeId: value<string>(row, 'initiativeId'),
        impactMedian: value<number>(row, 'impactMedian'),
        confidenceMedian: value<number>(row, 'confidenceMedian'),
        easeMedian: value<number>(row, 'easeMedian'),
        score: value<number>(row, 'score'),
        position: value<number>(row, 'position'),
      })),
      audit: [...auditById.values()].map((rows) => {
        const first = rows[0]!;
        const detailEntries = rows
          .filter((row) => typeof row.detailKey === 'string')
          .map((row) => [
            value<string>(row, 'detailKey'),
            parseDetail(value<string>(row, 'detailValue')),
          ] as const);
        return {
          id: value<string>(first, 'eventId'),
          actorId: value<string>(first, 'actorId'),
          actorRole: value<ActorRole>(first, 'actorRole'),
          action: value<string>(first, 'action'),
          fromStage: first.fromStage as SessionStage | null,
          toStage: first.toStage as SessionStage | null,
          at: value<string>(first, 'at'),
          ...(detailEntries.length === 0
            ? {}
            : { details: Object.fromEntries(detailEntries) }),
        };
      }),
    },
  };
}

async function availableId(
  repository: SessionRepository,
  base: string,
): Promise<string> {
  let candidate = base;
  let suffix = 2;
  while ((await repository.get(candidate)) !== null) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function importBackupWorkbook(
  bytes: Uint8Array,
  options: BackupImportOptions,
): Promise<BackupImportResult> {
  const manifest = await readManifest(bytes);
  const parsed = manifestToSnapshot(manifest);
  const importedId = await availableId(options.repository, parsed.localId);
  const preventiveCopyId =
    options.activeSnapshot === null || options.activeSnapshot === undefined
      ? null
      : await availableId(
          options.repository,
          `${options.activeSnapshot.localId}-preimport-${manifest.Metadata[0]!.backupId}`,
        );
  const requiredSlots = preventiveCopyId === null ? 1 : 2;
  if ((await options.repository.count()) + requiredSlots > LIMITS.localSessionsMax) {
    throw new Error(
      `El navegador no tiene espacio para importar y conservar la copia preventiva. El límite es ${LIMITS.localSessionsMax} sesiones.`,
    );
  }

  const activeSnapshot = options.activeSnapshot;
  if (preventiveCopyId !== null && activeSnapshot != null) {
    await options.repository.save({
      ...activeSnapshot,
      localId: preventiveCopyId,
    });
  }
  const snapshot = { ...parsed, localId: importedId };
  await options.repository.save(snapshot);
  return { snapshot, preventiveCopyId };
}
