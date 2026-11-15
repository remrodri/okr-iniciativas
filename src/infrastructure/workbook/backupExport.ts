import type { SessionSnapshot } from '@/domain/ports';
import { createBackupManifest } from './backupManifest';
import { BACKUP_SHEETS, type BackupSheetName } from './workbookSchema';

export interface BackupExportOptions {
  readonly now?: () => Date;
  readonly backupId?: string;
  readonly onProgress?: (progress: number) => void;
}

export async function exportBackupWorkbook(
  snapshot: SessionSnapshot,
  options: BackupExportOptions = {},
): Promise<Uint8Array> {
  const now = options.now?.() ?? new Date();
  const backupId = options.backupId ?? globalThis.crypto.randomUUID();
  options.onProgress?.(0);
  const manifest = await createBackupManifest(snapshot, {
    backupId,
    exportedAt: now.toISOString(),
  });
  options.onProgress?.(10);

  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'OKR Iniciativas';
  workbook.created = now;
  const sheetNames = Object.keys(BACKUP_SHEETS) as BackupSheetName[];

  sheetNames.forEach((sheetName, index) => {
    const schema = BACKUP_SHEETS[sheetName];
    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    worksheet.columns = schema.columns.map(({ key }) => ({
      header: key,
      key,
      width: Math.min(40, Math.max(14, key.length + 2)),
    }));
    worksheet.addRows(manifest[sheetName]);
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, worksheet.rowCount), column: schema.columns.length },
    };
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E78' },
      };
      cell.alignment = { vertical: 'middle' };
    });
    options.onProgress?.(10 + Math.round(((index + 1) / sheetNames.length) * 80));
  });

  const buffer = await workbook.xlsx.writeBuffer();
  options.onProgress?.(100);
  return new Uint8Array(buffer);
}

export function downloadBackupWorkbook(
  bytes: Uint8Array,
  sessionId: string,
): void {
  const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '-');
  const browserBytes = new Uint8Array(bytes.byteLength);
  browserBytes.set(bytes);
  const blob = new Blob([browserBytes.buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `respaldo-okr-${safeSessionId}.xlsx`;
  anchor.click();
  URL.revokeObjectURL(url);
}
