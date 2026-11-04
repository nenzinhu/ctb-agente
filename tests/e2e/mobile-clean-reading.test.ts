import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('ctb-reading-mode');
    sessionStorage.setItem('ctb-pmrv-splash-v1', '1');
  });
});

test('mobile usa rolagem natural e um único controle de leitura nas quatro consultas', async ({ page }) => {
  for (const route of ['/', '/pop', '/estrangeiros', '/pesos-dimensoes']) {
    await page.goto(route);
    await expect(page.getByRole('button', { name: 'Rolar conteúdo central', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('group', { name: 'Modo de leitura do conteúdo' })).toHaveCount(1);
    await expect(page.getByRole('group', { name: 'Navegação lateral' })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Páginas do conteúdo' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  }
});

test('estrangeiros preserva o preenchimento manual ao abrir e fechar as orientações', async ({ page }) => {
  await page.goto('/estrangeiros');
  const manual = page.getByText('Preencher dados manualmente', { exact: true });
  await expect(page.getByRole('combobox', { name: /País emissor da habilitação/ })).not.toBeVisible();
  await manual.click();
  await page.getByRole('combobox', { name: /País emissor da habilitação/ }).selectOption('AR');
  await manual.click();
  await manual.click();
  await expect(page.getByRole('combobox', { name: /País emissor da habilitação/ })).toHaveValue('AR');
});
