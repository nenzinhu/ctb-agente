import { expect, test } from '@playwright/test';

test.describe('Professor por modo de consulta', () => {
  test('consulta POP, esclarece uma simulação e compara infrações', async ({ page }) => {
    await page.goto('/professor');

    await page.getByRole('button', { name: /POP Procedimento passo a passo/i }).click();
    await page.getByLabel(/Sua pergunta ao professor/i).fill('Quando é permitido usar algemas?');
    await page.getByRole('button', { name: /^Perguntar$/i }).click();
    await expect(page.getByText(/POP 003 — USO DE ALGEMA/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Simulador Analisa uma ocorrência/i }).click();
    await page.getByLabel(/Sua pergunta ao professor/i).fill('O motorista estava usando o celular enquanto dirigia');
    await page.getByRole('button', { name: /^Perguntar$/i }).click();
    await expect(page.getByText(/Qual destas situações descreve melhor/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /763-31/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /763-32/ })).toBeVisible();
    await page.getByRole('button', { name: /763-31/ }).click();
    await expect(page.getByText('Analise a infração de código 763-31.')).toBeVisible();

    await page.getByRole('button', { name: /Infrações Fichas do MBFT/i }).click();
    await page.getByLabel(/Sua pergunta ao professor/i).fill('Compare 763-31 e 763-32');
    await page.getByRole('button', { name: /^Perguntar$/i }).click();
    await expect(page.getByLabel('Comparação entre infrações')).toBeVisible();
    await expect(page.getByText('Quando autuar', { exact: true })).toHaveCount(2);
  });
});
