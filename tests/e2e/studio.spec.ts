import { expect, test } from '@playwright/test';
import fs from 'node:fs';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId('result-count')).toBeVisible();
});

test('library shows 500 icons and search works in three languages', async ({ page }) => {
  await expect(page.getByTestId('result-count')).toHaveText('500 из 500');
  const search = page.getByRole('searchbox', { name: 'Поиск иконок' });
  for (const q of ['весы', 'терези', 'scales']) {
    await search.fill(q);
    await expect(page.locator('[data-icon-id="LAW-001"]')).toBeVisible();
  }
  await search.fill('qqqqzzz');
  await expect(page.getByText('Ничего не найдено')).toBeVisible();
});

test('selecting an icon and changing stroke width updates the canvas', async ({ page }) => {
  await page.getByRole('searchbox', { name: 'Поиск иконок' }).fill('стетоскоп');
  await page.locator('[data-icon-id="HLT-001"]').click();
  await expect(page.getByTestId('icon-title')).toHaveText('Стетоскоп');
  const field = page.getByRole('textbox', { name: 'Толщина' });
  await field.fill('2.6');
  await field.press('Enter');
  await expect(page.getByTestId('artboard').locator('g[stroke-linecap]')).toHaveAttribute('stroke-width', '2.6');
  await page.getByTestId('artboard').click();
  await page.keyboard.press('Control+z');
  await expect(page.getByTestId('artboard').locator('g[stroke-linecap]')).toHaveAttribute('stroke-width', '1.8');
});

test('exports SVG and PNG at the requested size', async ({ page }) => {
  await page.getByTestId('open-export').click();
  const dialog = page.getByRole('dialog', { name: 'Экспорт' });
  await dialog.getByRole('radio', { name: 'SVG', exact: true }).click();
  const [svgDl] = await Promise.all([page.waitForEvent('download'), dialog.getByTestId('export-download').click()]);
  const svg = fs.readFileSync(await svgDl.path(), 'utf8');
  expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
  expect(svg).toContain('stroke-width="1.8"');

  await page.getByTestId('open-export').click();
  await dialog.getByRole('radio', { name: 'PNG' }).click();
  await dialog.getByRole('button', { name: '256', exact: true }).click();
  const [pngDl] = await Promise.all([page.waitForEvent('download'), dialog.getByTestId('export-download').click()]);
  expect(pngDl.suggestedFilename()).toMatch(/-256x256\.png$/);
  const buf = fs.readFileSync(await pngDl.path());
  expect(buf.readUInt32BE(16)).toBe(256);
  expect(buf.readUInt32BE(20)).toBe(256);
});

test('batch export produces a ZIP with the selected icons', async ({ page }) => {
  await page.locator('[data-icon-id="LAW-001"]').click();
  await page.locator('[data-icon-id="LAW-002"]').click({ modifiers: ['Control'] });
  await page.locator('[data-icon-id="LAW-003"]').click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: 'ZIP' }).click();
  const dialog = page.getByRole('dialog', { name: 'Экспорт' });
  await dialog.getByRole('radio', { name: 'SVG', exact: true }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), dialog.getByTestId('export-download').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.zip$/);
  const zip = fs.readFileSync(await dl.path());
  expect(zip.subarray(0, 2).toString()).toBe('PK');
  expect(zip.toString('latin1')).toContain('legal/gavel.svg');
});

test('favorites and custom presets persist after reload', async ({ page }) => {
  await page.getByRole('button', { name: 'В избранное' }).click();
  await page.getByRole('button', { name: 'Сохранить пресет' }).first().click();
  await page.getByRole('textbox', { name: 'Название пресета' }).fill('Мой стиль');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: /^Избранное/ }).click();
  await expect(page.getByTestId('result-count')).toHaveText('1 из 500');
  await expect(page.getByRole('button', { name: 'Применить пресет Мой стиль' })).toBeVisible();
});

test('quality gallery lists every category with 50 icons', async ({ page }) => {
  await page.goto('/#quality');
  await expect(page.getByRole('heading', { name: 'Icon Quality Gallery' })).toBeVisible();
  await expect(page.locator('main button')).toHaveCount(50);
});

test('shadow switch knob stays inside its track', async ({ page }) => {
  const sw = page.getByRole('switch', { name: 'Тень' });
  await sw.scrollIntoViewIfNeeded();
  for (const state of ['false', 'true']) {
    await expect(sw).toHaveAttribute('aria-checked', state);
    const track = (await sw.boundingBox())!;
    const knob = (await sw.locator('span').boundingBox())!;
    expect(knob.x).toBeGreaterThanOrEqual(track.x);
    expect(knob.x + knob.width).toBeLessThanOrEqual(track.x + track.width + 0.5);
    if (state === 'false') await sw.click();
  }
  await expect(page.getByTestId('artboard').locator('feDropShadow')).toHaveCount(1);
});

test('command palette jumps to an icon', async ({ page }) => {
  await page.keyboard.press('Control+k');
  await page.getByRole('textbox', { name: 'Поиск по иконкам и командам' }).fill('копилка');
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('icon-title')).toHaveText('Копилка');
});

test('copy-as menu and SVG sprite export', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: /Код и файлы/ }).click();
  await page.getByRole('menuitem', { name: /React-компонент/ }).click();
  const jsx = await page.evaluate(() => navigator.clipboard.readText());
  expect(jsx).toContain('export function ScalesOfJusticeIcon');
  expect(jsx).toContain('strokeWidth={strokeWidth}');

  await page.locator('[data-icon-id="LAW-001"]').click({ modifiers: ['Control'] });
  await page.locator('[data-icon-id="LAW-002"]').click({ modifiers: ['Control'] });
  await page.getByRole('button', { name: 'ZIP' }).click();
  const dialog = page.getByRole('dialog', { name: 'Экспорт' });
  await dialog.getByRole('radio', { name: 'Спрайт' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download'), dialog.getByTestId('export-download').click()]);
  const sprite = fs.readFileSync(await dl.path(), 'utf8');
  expect(sprite).toContain('<symbol id="scales-of-justice"');
  expect(sprite).toContain('<symbol id="gavel"');
});
