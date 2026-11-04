import { expect, test } from '@playwright/test';

for (const width of [320, 390, 1440]) {
  test(`seletor compacto e desenho ampliado cabem em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/pesos-dimensoes');
    await page.getByText('Ver desenho ampliado e identificação dos eixos', { exact: true }).click();
    const seletor = page.getByRole('button', { name: 'Selecionar configuração do veículo' });
    await seletor.click();
    const lista = page.getByRole('listbox', { name: 'Configurações de veículo' });
    await expect(lista.getByRole('option')).toHaveCount(12);
    const carreta = lista.getByRole('option', { name: /Cavalo 6x2\/6x4 \+ semirreboque de 3 eixos/i });
    await carreta.click();
    await expect(seletor).toContainText('3S3');
    await expect(seletor.locator('[data-eixo="true"]')).toHaveCount(6);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await seletor.focus();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Escape');
    await expect(seletor).toBeFocused();
  });
}

test('bandeiras selecionam o país e os modelos de documentos abrem sob demanda', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/estrangeiros');
  await page.getByRole('button', { name: 'Colômbia', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'País emissor da habilitação', exact: true })).toHaveValue('CO');
  const modelo = page.locator('details').filter({ hasText: 'Ver modelo de habilitação' });
  await expect(modelo.getByRole('img')).not.toBeVisible();
  await modelo.locator('summary').click();
  const imagem = modelo.getByRole('img', { name: /modelo ilustrativo de habilitação/i });
  await expect(imagem).toBeVisible();
  await expect(imagem).toHaveJSProperty('complete', true);
  expect(await imagem.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
