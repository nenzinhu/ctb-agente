import { expect, test } from '@playwright/test';

test('abertura mostra brasão e viatura, permite pular e não repete na sessão', async ({ page }) => {
  await page.goto('/');
  const splash = page.getByRole('dialog', { name: 'CTB Agente' });
  await expect(splash).toBeVisible();
  await expect(splash.getByRole('img', { name: /Brasão da Polícia Militar Rodoviária/ })).toBeVisible();
  await expect.poll(() => splash.locator('img[src*="viatura"]').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await expect(splash.getByRole('button', { name: 'Pular abertura' })).toBeFocused();
  await splash.getByRole('button', { name: 'Pular abertura' }).click();
  await expect(splash).not.toBeAttached();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Rolar conteúdo central' })).toBeVisible();
  await expect(splash).not.toBeAttached();
});

test('movimento reduzido mantém a identidade sem giroflex animado', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  const splash = page.getByRole('dialog', { name: 'CTB Agente' });
  await expect(splash).toHaveAttribute('data-reduced-motion', 'true');
  await expect.poll(() => splash.locator('img[src*="viatura"]').evaluate(image => getComputedStyle(image.parentElement!).animationName)).toBe('none');
  await page.clock.runFor(1200);
  await expect(splash).not.toBeAttached();
});

test('Escape encerra a abertura e devolve o acesso ao app', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'CTB Agente' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'CTB Agente' })).not.toBeAttached();
  expect(await page.locator('#conteudo').evaluate(element => (element as HTMLElement).inert)).toBe(false);
});

test('entrada administrativa não mostra abertura', async ({ page }) => {
  await page.goto('/admin/login');
  await expect(page.locator('.page-viewport')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'CTB Agente' })).not.toBeAttached();
});


test('abertura normal termina automaticamente sem bloquear o conteúdo', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('dialog', { name: 'CTB Agente' })).toBeVisible();
  await page.clock.runFor(3100);
  await expect(page.getByRole('dialog', { name: 'CTB Agente' })).not.toBeAttached();
  expect(await page.locator('#conteudo').evaluate(element => (element as HTMLElement).inert)).toBe(false);
});
