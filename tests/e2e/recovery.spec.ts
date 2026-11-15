import { expect, test } from '@playwright/test';
import type { SessionSnapshot } from '../../src/domain/ports';
import { finalizeSession, isSessionAccessible } from '../../src/domain/lifecycle';
import { InMemorySessionRepository } from '../../src/infrastructure/browser-storage/memorySessionRepository';
import { exportBackupWorkbook } from '../../src/infrastructure/workbook/backupExport';
import { importBackupWorkbook } from '../../src/infrastructure/workbook/backupImport';

test.setTimeout(120_000);

function snapshot(): SessionSnapshot {
  const now = '2026-11-15T10:00:00.000Z';
  return {
    localId: 'active', sessionId: 'session', revision: 1, savedAt: now, formatVersion: 1,
    state: {
      session: { id: 'session', version: 1, stage: 'RESULTADO_FINAL', x0: 'X0', xf: 'Xf',
        expectedParticipants: 1, initiativesPerParticipant: 1, finalistCount: 1,
        finalistIds: ['i-1'], tieBreak: null, iceConfig: { method: 'MULTIPLICATIVE', weights: null },
        paused: false, createdAt: now, updatedAt: now },
      participants: [], initiatives: [{ id: 'i-1', text: 'Idea', authorIds: [], originals: [], status: 'ACTIVE', mergedIntoId: null, revision: 1 }],
      clarifications: [], ballots: [], iceEvaluations: [], ranking: [], audit: [],
    },
  };
}

test('recupera borrador, reintenta y cambia de dispositivo sin duplicar participante', async ({ page, browser }) => {
  await page.goto('/#/facilitador/nueva');
  await page.getByLabel('X0').fill('Problema');
  await page.getByLabel('Xf').fill('Solución');
  await page.getByLabel('Participantes esperados').fill('1');
  await page.getByLabel('Iniciativas por participante').fill('1');
  await page.getByRole('button', { name: 'Crear sesión' }).click();
  const publicCode = (await page.getByText(/^[A-Z2-9]{8}$/).first().textContent())!;
  const tokens = await page.getByText(/^[a-f0-9]{64}$/).allTextContents();
  const participantToken = tokens[0]!;
  await page.getByRole('button', { name: 'Abrir sala de espera' }).click();
  await page.getByRole('button', { name: 'Abrir brainstorming' }).click();

  const firstContext = await browser.newContext();
  const participant = await firstContext.newPage();
  await participant.goto(`/#/participar/${publicCode}`);
  await participant.getByLabel('Clave personal').fill(participantToken);
  await participant.getByLabel('Tu nombre real').fill('Persona recuperada');
  await participant.getByRole('button', { name: 'Ingresar' }).click();
  await participant.getByLabel('Iniciativa 1').fill('Idea conservada sin conexión');
  await participant.getByRole('button', { name: 'Revisar iniciativas' }).click();
  await firstContext.setOffline(true);
  await participant.getByRole('button', { name: 'Confirmar envío' }).click();
  await expect(participant.getByText(/Sin conexión/).first()).toBeVisible();
  await firstContext.setOffline(false);
  await participant.reload();
  await expect(participant.getByLabel('Iniciativa 1')).toHaveValue('Idea conservada sin conexión');
  await participant.getByRole('button', { name: 'Revisar iniciativas' }).click();
  await participant.getByRole('button', { name: 'Confirmar envío' }).click();
  await expect(participant.getByText('Envío confirmado')).toBeVisible();

  const secondContext = await browser.newContext();
  const recovered = await secondContext.newPage();
  await recovered.goto(`/#/participar/${publicCode}`);
  await recovered.getByLabel('Clave personal').fill(participantToken);
  await recovered.getByLabel('Tu nombre real').fill('Persona recuperada');
  await recovered.getByRole('button', { name: 'Ingresar' }).click();
  await expect(recovered.getByText('Envío confirmado', { exact: true })).toBeVisible();
  await expect(page.getByText('Iniciativas enviadas')).toHaveCount(1);
  await firstContext.close(); await secondContext.close();
});

test('importación segura y expiración terminan en estados previsibles', async () => {
  const active = snapshot();
  const bytes = await exportBackupWorkbook(active, { backupId: 'e2e-recovery' });
  const repository = new InMemorySessionRepository();
  await repository.save(active);
  const imported = await importBackupWorkbook(bytes, { repository, activeSnapshot: active });
  expect(imported.snapshot.state).toEqual(active.state);
  expect(await repository.count()).toBe(3);

  const finalized = finalizeSession(active.state.session, '2026-11-15T12:00:00.000Z');
  expect(isSessionAccessible(finalized, '2026-11-16T11:59:59.000Z')).toBe(true);
  expect(isSessionAccessible(finalized, '2026-11-16T12:00:00.000Z')).toBe(false);
});
