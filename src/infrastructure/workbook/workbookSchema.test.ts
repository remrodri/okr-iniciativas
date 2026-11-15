import { describe, expect, it } from 'vitest';

import {
  BACKUP_FORMAT_VERSION,
  BACKUP_SHEETS,
  validateBackupManifest,
} from './workbookSchema';
import {
  invalidBackupFixtures,
  validBackupFixture,
} from '@/../tests/fixtures/workbook/backupFixtures';

describe('esquema versionado del respaldo Excel', () => {
  it('acepta un manifiesto normalizado completo', () => {
    const validated = validateBackupManifest(validBackupFixture());

    expect(validated.Metadata[0]?.formatVersion).toBe(BACKUP_FORMAT_VERSION);
    expect(Object.keys(validated)).toEqual(Object.keys(BACKUP_SHEETS));
  });

  it.each(invalidBackupFixtures())('rechaza $name', ({ manifest }) => {
    expect(() => validateBackupManifest(manifest)).toThrow();
  });

  it('declara y valida cada columna obligatoria de todas las hojas', () => {
    for (const [sheetName, sheet] of Object.entries(BACKUP_SHEETS)) {
      const fixture = validBackupFixture() as unknown as Record<
        string,
        Record<string, unknown>[]
      >;
      const row = fixture[sheetName]?.[0];
      expect(row).toBeDefined();
      for (const column of sheet.columns) {
        const withoutColumn = structuredClone(fixture);
        delete withoutColumn[sheetName]![0]![column.key];
        expect(
          () => validateBackupManifest(withoutColumn),
          `${sheetName}.${column.key}`,
        ).toThrow(`Falta la columna obligatoria ${column.key}`);
      }
    }
  });
});
