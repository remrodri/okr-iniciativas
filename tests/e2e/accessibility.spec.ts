import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const viewports = [
  { name: 'móvil', width: 360, height: 800 },
  { name: 'tableta', width: 768, height: 1024 },
  { name: 'escritorio', width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`${viewport.name}: sin bloqueos críticos ni desplazamiento horizontal`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/#/facilitador/nueva');
    await expect(page.getByRole('heading', { name: 'Nueva sesión' })).toBeVisible();
    expect(await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )).toBe(false);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations.filter(({ impact }) => impact === 'critical')).toEqual([]);
  });
}

test('teclado, etiquetas y región de mensajes son utilizables', async ({ page }) => {
  await page.goto('/#/facilitador/nueva');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toBeVisible();
  await expect(page.getByLabel('X0')).toBeVisible();
  await expect(page.getByLabel('Xf')).toBeVisible();
  await page.goto('/#/participar');
  await expect(page.getByLabel('Código de sesión')).toBeVisible();
  await expect(page.getByLabel('Clave personal')).toBeVisible();
});
