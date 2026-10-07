import { expect, test } from '@playwright/test';

test.describe('Consulta aos manuais incluídos no aplicativo', () => {
  test('encontra a ficha do celular mesmo com erro de digitação', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Sua consulta').fill('segurando celualr');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    const ficha = page.getByRole('article', { name: 'Ficha de Fiscalização', exact: true });
    await expect(ficha).toContainText('763-31');
    await expect(ficha).toContainText('Dirigir veículo segurando telefone celular.');
  });

  test('mostra os enquadramentos em linhas e permite trocar a ficha', async ({ page }) => {
    await page.goto('/consulta?q=art.%20181%2C%20XX');
    const escolhas = page.getByRole('group', { name: /Enquadramentos encontrados/ });
    await expect(escolhas.getByRole('radio')).toHaveCount(2);
    await expect(escolhas.getByRole('radio', { name: /762-51/ })).toBeVisible();
    await expect(escolhas.getByRole('radio', { name: /762-52/ })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /Enquadramentos encontrados/ })).toHaveCount(0);

    await escolhas.getByRole('radio', { name: /762-52/ }).check();
    const ficha = page.getByRole('article', { name: 'Ficha de Fiscalização', exact: true });
    await expect(ficha).toContainText('762-52');
    await expect(ficha).toContainText('idosos');
    await expect(escolhas.getByRole('radio', { name: /762-52/ })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('mostra os POPs em linhas e abre o procedimento selecionado', async ({ page }) => {
    await page.goto('/pop');
    await page.getByLabel('Sua pergunta sobre os POPs').fill('abordagem');
    await page.getByRole('button', { name: 'Perguntar', exact: true }).click();
    const escolhas = page.getByRole('group', { name: /POPs encontrados/ });
    await expect(escolhas.getByRole('radio', { name: /POP 004/ })).toBeVisible();
    await expect(escolhas.getByRole('radio', { name: /POP 005/ })).toBeVisible();
    await expect(page.getByRole('combobox', { name: /POPs encontrados/ })).toHaveCount(0);

    await escolhas.getByRole('radio', { name: /POP 005/ }).check();
    await expect(page.getByRole('article', { name: 'ABORDAGEM POLICIAL (TÉCNICA POLICIAL)', exact: true })).toContainText('POP 005');
    await expect(escolhas.getByRole('radio', { name: /POP 005/ })).toBeChecked();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
});
