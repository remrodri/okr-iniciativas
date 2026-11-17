import Button from "@mui/material/Button";
import type { SessionSnapshot } from "@/domain/ports";
import { downloadBackupWorkbook } from "@/infrastructure/workbook/backupExport";
import { exportSharedReport } from "@/infrastructure/workbook/reportExport";

export function SharedReportButton({
  snapshot,
}: {
  readonly snapshot: SessionSnapshot;
}) {
  return (
    <Button
      sx={{
        width:"100%"
      }}
      variant="outlined"
      onClick={() =>
        void exportSharedReport(snapshot).then((bytes) =>
          downloadBackupWorkbook(bytes, `reporte-${snapshot.sessionId}`),
        )
      }
    >
      Exportar reporte compartible
    </Button>
  );
}
