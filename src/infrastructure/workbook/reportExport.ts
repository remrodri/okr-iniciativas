import type ExcelJS from 'exceljs';
import type { SessionSnapshot } from '@/domain/ports';

type ReportSheetName = 'Resumen' | 'Participantes' | 'Iniciativas' | 'Depuración' | 'ICE' | 'Ranking';

function styleSheet(worksheet: ExcelJS.Worksheet): void {
  worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, worksheet.rowCount), column: worksheet.columnCount } };
  worksheet.getRow(1).height = 24;
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  worksheet.eachRow((row, index) => {
    if (index > 1) row.eachCell((cell) => { cell.font = { name: 'Arial', size: 10 }; cell.alignment = { vertical: 'middle' }; });
  });
}

export async function exportSharedReport(snapshot: SessionSnapshot): Promise<Uint8Array> {
  const { default: ExcelJSRuntime } = await import('exceljs');
  const workbook = new ExcelJSRuntime.Workbook();
  workbook.creator = 'OKR Iniciativas';
  const { state } = snapshot;
  const participantById = new Map(state.participants.map((item) => [item.id, item]));
  const initiativeById = new Map(state.initiatives.map((item) => [item.id, item]));
  const voteTotals = new Map<string, number>();
  state.ballots.filter(({ round }) => round === 'REFINEMENT').forEach(({ selection }) =>
    selection.forEach((id) => voteTotals.set(id, (voteTotals.get(id) ?? 0) + 1)),
  );

  const add = (name: ReportSheetName, columns: { header: string; key: string; width: number }[], rows: Record<string, unknown>[]) => {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = columns;
    sheet.addRows(rows);
    styleSheet(sheet);
    return sheet;
  };
  add('Resumen', [
    { header: 'Campo', key: 'field', width: 28 }, { header: 'Valor', key: 'value', width: 55 },
  ], [
    { field: 'Situación actual (X0)', value: state.session.x0 },
    { field: 'Situación deseada (Xf)', value: state.session.xf },
    { field: 'Etapa', value: state.session.stage },
    { field: 'Participantes', value: state.participants.length },
    { field: 'Iniciativas', value: state.initiatives.length },
    { field: 'Finalistas', value: state.session.finalistCount ?? 0 },
    { field: 'Método ICE', value: state.session.iceConfig?.method ?? 'Sin configurar' },
  ]);
  add('Participantes', [
    { header: 'Nombre', key: 'name', width: 28 }, { header: 'Alias', key: 'alias', width: 18 },
    { header: 'Brainstorming', key: 'brainstorming', width: 16 }, { header: 'Depuración', key: 'refinement', width: 16 },
    { header: 'ICE', key: 'ice', width: 12 },
  ], state.participants.map((participant) => ({
    name: participant.realName, alias: participant.alias,
    brainstorming: participant.progress.brainstormingSubmitted ? 'Enviado' : 'Pendiente',
    refinement: participant.progress.refinementSubmitted ? 'Enviado' : 'Pendiente',
    ice: participant.progress.iceSubmitted ? 'Enviado' : 'Pendiente',
  })));
  add('Iniciativas', [
    { header: 'ID', key: 'id', width: 18 }, { header: 'Iniciativa', key: 'text', width: 55 },
    { header: 'Autores', key: 'authors', width: 40 }, { header: 'Estado', key: 'status', width: 14 },
  ], state.initiatives.map((initiative) => ({
    id: initiative.id, text: initiative.text,
    authors: initiative.authorIds.map((id) => participantById.get(id)?.realName ?? id).join(', '),
    status: initiative.status,
  })));
  add('Depuración', [
    { header: 'ID', key: 'id', width: 18 }, { header: 'Iniciativa', key: 'text', width: 55 },
    { header: 'Total de votos', key: 'votes', width: 18 }, { header: 'Finalista', key: 'finalist', width: 14 },
  ], state.initiatives.filter(({ status }) => status === 'ACTIVE').map((initiative) => ({
    id: initiative.id, text: initiative.text, votes: voteTotals.get(initiative.id) ?? 0,
    finalist: state.session.finalistIds?.includes(initiative.id) ? 'Sí' : 'No',
  })));
  add('ICE', [
    { header: 'ID', key: 'id', width: 18 }, { header: 'Iniciativa', key: 'text', width: 55 },
    { header: 'Impacto mediano', key: 'impact', width: 18 }, { header: 'Confianza mediana', key: 'confidence', width: 20 },
    { header: 'Facilidad mediana', key: 'ease', width: 19 }, { header: 'Puntuación', key: 'score', width: 16 },
  ], state.ranking.map((entry) => ({
    id: entry.initiativeId, text: initiativeById.get(entry.initiativeId)?.text ?? entry.initiativeId,
    impact: entry.impactMedian, confidence: entry.confidenceMedian, ease: entry.easeMedian, score: entry.score,
  })));
  add('Ranking', [
    { header: 'Posición', key: 'position', width: 12 }, { header: 'Iniciativa', key: 'text', width: 55 },
    { header: 'Autores', key: 'authors', width: 40 }, { header: 'Puntuación', key: 'score', width: 16 },
  ], state.ranking.map((entry) => {
    const initiative = initiativeById.get(entry.initiativeId);
    return { position: entry.position, text: initiative?.text ?? entry.initiativeId,
      authors: initiative?.authorIds.map((id) => participantById.get(id)?.realName ?? id).join(', ') ?? '', score: entry.score };
  }));
  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}
