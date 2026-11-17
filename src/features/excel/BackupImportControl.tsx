import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IndexedDbSessionRepository } from "@/infrastructure/browser-storage/indexedDbSessionRepository";
import { importBackupWorkbook } from "@/infrastructure/workbook/backupImport";
import DocumentScannerIcon from "@mui/icons-material/DocumentScanner";


export function BackupImportControl() {
  const input = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const repository = useMemo(() => new IndexedDbSessionRepository(), []);
  const [error, setError] = useState<string | null>(null);
  async function load(file: File) {
    try {
      const result = await importBackupWorkbook(
        new Uint8Array(await file.arrayBuffer()),
        { repository },
      );
      navigate(`/consulta/${result.snapshot.localId}`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "No se pudo importar.",
      );
    }
  }
  return (
    <Stack spacing={1}>
      <input
        ref={input}
        hidden
        type="file"
        accept=".xlsx"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file !== undefined) void load(file);
        }}
      />
      <Button
        variant="outlined"
        onClick={() => input.current?.click()}
        sx={{
          "&:hover": {
            backgroundColor: "rgba(0, 81, 5, 0.56)",
            color: "white",
            borderColor: "rgba(0, 61, 4, 0.64)",
          },
          // borderColor: "rgba(8, 145, 17, 0.56)",
        }}
      >
        <DocumentScannerIcon sx={{ mr:1}}/>
        Importar respaldo Excel
      </Button>
      {error === null ? null : <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
