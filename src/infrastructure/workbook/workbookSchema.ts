export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_APPLICATION = 'okr-iniciativas';

type CellType = 'string' | 'number' | 'boolean';

export interface WorkbookColumn {
  readonly key: string;
  readonly type: CellType;
  readonly nullable?: boolean;
  readonly values?: readonly (string | number | boolean)[];
}

export interface WorkbookSheetSchema {
  readonly columns: readonly WorkbookColumn[];
  readonly singleRow?: boolean;
}

const column = (
  key: string,
  type: CellType,
  options: Omit<WorkbookColumn, 'key' | 'type'> = {},
): WorkbookColumn => ({ key, type, ...options });

export const BACKUP_SHEETS = {
  Metadata: {
    singleRow: true,
    columns: [
      column('formatVersion', 'number'),
      column('application', 'string'),
      column('backupId', 'string'),
      column('exportedAt', 'string'),
      column('checksum', 'string'),
    ],
  },
  Session: {
    singleRow: true,
    columns: [
      column('id', 'string'),
      column('version', 'number'),
      column('stage', 'string'),
      column('x0', 'string'),
      column('xf', 'string'),
      column('expectedParticipants', 'number'),
      column('initiativesPerParticipant', 'number'),
      column('finalistCount', 'number', { nullable: true }),
      column('iceMethod', 'string', {
        nullable: true,
        values: ['MULTIPLICATIVE', 'WEIGHTED'],
      }),
      column('weightImpact', 'number', { nullable: true }),
      column('weightConfidence', 'number', { nullable: true }),
      column('weightEase', 'number', { nullable: true }),
      column('paused', 'boolean'),
      column('createdAt', 'string'),
      column('updatedAt', 'string'),
      column('finalizedAt', 'string', { nullable: true }),
      column('expiresAt', 'string', { nullable: true }),
    ],
  },
  Participants: {
    columns: [
      column('id', 'string'),
      column('alias', 'string'),
      column('realName', 'string'),
      column('accessTokenId', 'string'),
      column('brainstormingSubmitted', 'boolean'),
      column('refinementSubmitted', 'boolean'),
      column('tieBreakSubmitted', 'boolean'),
      column('iceSubmitted', 'boolean'),
      column('connected', 'boolean'),
    ],
  },
  Initiatives: {
    columns: [
      column('id', 'string'),
      column('text', 'string'),
      column('status', 'string', { values: ['ACTIVE', 'FUSED'] }),
      column('mergedIntoId', 'string', { nullable: true }),
      column('revision', 'number'),
    ],
  },
  Refinements: {
    columns: [
      column('recordId', 'string'),
      column('kind', 'string', {
        values: [
          'AUTHOR',
          'ORIGINAL',
          'FINALIST',
          'TIE_CANDIDATE',
          'CLARIFICATION',
        ],
      }),
      column('initiativeId', 'string'),
      column('relatedId', 'string', { nullable: true }),
      column('text', 'string', { nullable: true }),
      column('numericValue', 'number', { nullable: true }),
      column('createdAt', 'string', { nullable: true }),
      column('status', 'string', { nullable: true }),
      column('responseText', 'string', { nullable: true }),
    ],
  },
  Votes: {
    columns: [
      column('ballotId', 'string'),
      column('participantId', 'string'),
      column('round', 'string', { values: ['REFINEMENT', 'TIEBREAK'] }),
      column('selectedInitiativeId', 'string'),
      column('selectionOrder', 'number'),
      column('submissionId', 'string'),
      column('submittedAt', 'string'),
    ],
  },
  IceRatings: {
    columns: [
      column('evaluationId', 'string'),
      column('participantId', 'string'),
      column('initiativeId', 'string'),
      column('impact', 'number'),
      column('confidence', 'number'),
      column('ease', 'number'),
      column('submissionId', 'string'),
      column('submittedAt', 'string'),
    ],
  },
  Results: {
    columns: [
      column('initiativeId', 'string'),
      column('impactMedian', 'number'),
      column('confidenceMedian', 'number'),
      column('easeMedian', 'number'),
      column('score', 'number'),
      column('position', 'number'),
    ],
  },
  Audit: {
    columns: [
      column('eventId', 'string'),
      column('actorId', 'string'),
      column('actorRole', 'string', {
        values: ['FACILITATOR', 'PARTICIPANT', 'SYSTEM'],
      }),
      column('action', 'string'),
      column('fromStage', 'string', { nullable: true }),
      column('toStage', 'string', { nullable: true }),
      column('at', 'string'),
      column('detailKey', 'string', { nullable: true }),
      column('detailValue', 'string', { nullable: true }),
    ],
  },
} as const satisfies Readonly<Record<string, WorkbookSheetSchema>>;

export type BackupSheetName = keyof typeof BACKUP_SHEETS;
type BackupRow = Record<string, string | number | boolean | null>;

export interface NormalizedBackup {
  readonly Metadata: BackupRow[];
  readonly Session: BackupRow[];
  readonly Participants: BackupRow[];
  readonly Initiatives: BackupRow[];
  readonly Refinements: BackupRow[];
  readonly Votes: BackupRow[];
  readonly IceRatings: BackupRow[];
  readonly Results: BackupRow[];
  readonly Audit: BackupRow[];
}

function assertCell(
  sheetName: string,
  rowIndex: number,
  columnSchema: WorkbookColumn,
  value: unknown,
): void {
  if (value === null && columnSchema.nullable === true) return;
  if (
    typeof value !== columnSchema.type ||
    (columnSchema.type === 'number' && !Number.isFinite(value))
  ) {
    throw new Error(
      `${sheetName}[${rowIndex}].${columnSchema.key} debe ser ${columnSchema.type}${columnSchema.nullable === true ? ' o null' : ''}.`,
    );
  }
  if (
    columnSchema.values !== undefined &&
    !columnSchema.values.includes(value as string | number | boolean)
  ) {
    throw new Error(
      `${sheetName}[${rowIndex}].${columnSchema.key} contiene un valor no admitido.`,
    );
  }
}

export function validateBackupManifest(input: unknown): NormalizedBackup {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new Error('El manifiesto del respaldo no es un objeto.');
  }
  const manifest = input as Record<string, unknown>;
  const expectedSheets = Object.keys(BACKUP_SHEETS);
  const actualSheets = Object.keys(manifest);
  const unexpected = actualSheets.find((name) => !expectedSheets.includes(name));
  if (unexpected !== undefined) {
    throw new Error(`La hoja ${unexpected} no está declarada en el formato.`);
  }

  for (const [sheetName, sheetSchema] of Object.entries(BACKUP_SHEETS)) {
    const rows = manifest[sheetName];
    if (!Array.isArray(rows)) {
      throw new Error(`Falta la hoja obligatoria ${sheetName}.`);
    }
    if (
      'singleRow' in sheetSchema &&
      sheetSchema.singleRow === true &&
      rows.length !== 1
    ) {
      throw new Error(`La hoja ${sheetName} debe contener exactamente una fila.`);
    }
    rows.forEach((row: unknown, rowIndex: number) => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) {
        throw new Error(`La fila ${rowIndex + 1} de ${sheetName} no es válida.`);
      }
      const record = row as Record<string, unknown>;
      const allowedKeys = sheetSchema.columns.map((item) => item.key);
      const extraKey = Object.keys(record).find(
        (key) => !allowedKeys.includes(key),
      );
      if (extraKey !== undefined) {
        throw new Error(`La columna ${extraKey} no pertenece a ${sheetName}.`);
      }
      for (const columnSchema of sheetSchema.columns) {
        if (!Object.hasOwn(record, columnSchema.key)) {
          throw new Error(
            `Falta la columna obligatoria ${columnSchema.key} en ${sheetName}.`,
          );
        }
        assertCell(
          sheetName,
          rowIndex,
          columnSchema,
          record[columnSchema.key],
        );
      }
    });
  }

  const metadata = (manifest.Metadata as BackupRow[])[0];
  if (metadata?.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new Error(
      `Versión incompatible. Se requiere ${BACKUP_FORMAT_VERSION}.`,
    );
  }
  if (metadata.application !== BACKUP_APPLICATION) {
    throw new Error('El archivo no fue generado por esta aplicación.');
  }
  return manifest as unknown as NormalizedBackup;
}
