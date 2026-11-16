import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import ExcelJS from 'exceljs';
import { readFile } from 'node:fs/promises';

test.setTimeout(300_000);

async function enterAndBrainstorm(
  context: BrowserContext,
  publicCode: string,
  token: string,
  participantIndex: number,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`/#/participar/${publicCode}`);
  await page.getByLabel('Clave personal').fill(token);
  await page.getByLabel('Tu nombre real').fill(`Persona ${participantIndex + 1}`);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByText(/Hola,/)).toBeVisible();
  for (let initiative = 0; initiative < 5; initiative += 1) {
    await page.getByLabel(`Iniciativa ${initiative + 1}`).fill(
      `Iniciativa ${participantIndex + 1}-${initiative + 1}`,
    );
  }
  await page.getByRole('button', { name: 'Revisar iniciativas' }).click();
  await page.getByRole('button', { name: 'Confirmar envío' }).click();
  await expect(page.getByText('Envío confirmado')).toBeVisible();
  return page;
}

test('flujo 6×5 → 15 → desempate → ICE → ranking', async ({ page, browser }) => {
  await page.goto('/#/facilitador/nueva');
  await page.getByLabel('X0').fill('Retrasos en el proceso industrial');
  await page.getByLabel('Xf').fill('Proceso industrial estable y medible');
  await page.getByLabel('Participantes esperados').fill('6');
  await page.getByLabel('Iniciativas por participante').fill('5');
  await page.getByRole('button', { name: 'Crear sesión' }).click();
  await expect(page.getByRole('heading', { name: 'Panel del facilitador' })).toBeVisible();

  const publicCode = (await page.getByText(/^[A-Z2-9]{8}$/).first().textContent())!;
  await page.getByRole('button', { name: 'Accesos personales' }).click();
  const allTokens = await page.getByText(/^[a-f0-9]{64}$/).allTextContents();
  expect(allTokens.length).toBeGreaterThanOrEqual(6);
  const participantTokens = allTokens.slice(0, 6);

  await page.getByRole('button', { name: 'Control de etapa' }).click();
  await page.getByRole('button', { name: 'Abrir sala de espera' }).click();
  await page.getByRole('button', { name: 'Abrir brainstorming' }).click();
  await expect(page.getByRole('button', { name: 'Cerrar brainstorming y revisar' })).toBeVisible();

  const contexts = await Promise.all(participantTokens.map(() => browser.newContext()));
  const participants = await Promise.all(
    contexts.map((context, index) =>
      enterAndBrainstorm(context, publicCode, participantTokens[index]!, index),
    ),
  );

  await page.getByRole('button', { name: 'Cerrar brainstorming y revisar' }).click();
  await expect(page.getByText(/Revisión ciega: la autoría permanece oculta/)).toBeVisible();
  await expect(
    page.getByText('Hay 30 iniciativas disponibles después de la revisión.'),
  ).toBeVisible({ timeout: 30_000 });
  await page.getByLabel('Cantidad de finalistas (N)').fill('15');
  await page.getByRole('button', { name: 'Abrir depuración' }).click();

  await Promise.all(participants.map(async (participant, index) => {
    await expect(participant.getByRole('heading', { name: 'Selecciona las iniciativas prioritarias' })).toBeVisible();
    const checkboxes = participant.getByRole('checkbox');
    for (let selected = 0; selected < 14; selected += 1) await checkboxes.nth(selected).check();
    await checkboxes.nth(14 + (index % 3)).check();
    await participant.getByRole('button', { name: 'Revisar voto' }).click();
    await participant.getByRole('button', { name: 'Confirmar voto' }).click();
    await expect(participant.getByText(/Voto confirmado/)).toBeVisible();
  }));

  await expect(page.getByText('6 de 6 votos completos')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar depuración y calcular finalistas' }).click();
  await expect(page.getByRole('heading', { name: 'Desempate de depuración' })).toBeVisible();
  await page.getByRole('checkbox').first().check();
  await page.getByRole('button', { name: 'Confirmar desempate' }).click();
  await expect(page.getByRole('heading', { name: 'Configuración ICE' })).toBeVisible();
  await page.getByRole('button', { name: 'Iniciar evaluación ICE' }).click();

  await Promise.all(participants.map(async (participant) => {
    for (let index = 0; index < 15; index += 1) {
      await participant.getByLabel('Impacto').fill('8');
      await participant.getByLabel('Confianza').fill('7');
      await participant.getByLabel('Facilidad').fill('6');
      await participant.getByRole('button', { name: index === 14 ? 'Revisar evaluación' : 'Siguiente' }).click();
    }
    await participant.getByRole('button', { name: 'Confirmar evaluación' }).click();
    await expect(participant.getByText('Evaluación ICE confirmada.')).toBeVisible();
  }));

  await page.getByRole('button', { name: 'Publicar resultado final' }).click();
  await expect(page.getByText('Puesto 1').first()).toBeVisible();
  await expect(page.getByText('Puntuación 336,00').first()).toBeVisible();

  await expect(page.getByRole('button', { name: 'Exportar respaldo' })).toBeVisible();
  const reportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar reporte compartible' }).click();
  const reportPath = await (await reportDownload).path();
  expect(reportPath).not.toBeNull();
  const reportBytes = await readFile(reportPath!);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(reportBytes.buffer.slice(reportBytes.byteOffset, reportBytes.byteOffset + reportBytes.byteLength));
  expect(workbook.getWorksheet('Ranking')?.rowCount).toBe(16);
  expect(workbook.getWorksheet('Votes')).toBeUndefined();

  await Promise.all(contexts.map((context) => context.close()));
});
