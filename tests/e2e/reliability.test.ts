import { expect, test } from '@playwright/test';

test('falha de rede CTB termina em erro e nova tentativa consulta o manual real', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/consulta', async (route) => {
    if (attempts++ === 0) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/consulta?q=moto%20sem%20capacete');
  const error = page.getByRole('main').getByRole('alert');
  await expect(error).toContainText(/conectar ao serviço/);
  await expect(error.getByRole('link', { name: /Consultar o CTB no Planalto/ })).toBeVisible();
  await error.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Ficha de Fiscalização', exact: true })).toContainText(/capacete/i);
});

test('consulta CTB parada chega a tempo excedido e oferece nova tentativa', async ({ page }) => {
  await page.clock.install();
  await page.route('**/api/consulta', () => {});
  await page.goto('/consulta?q=moto%20sem%20capacete');
  await expect(page.getByText('Buscando informações...', { exact: true })).toBeAttached();
  await page.clock.fastForward(15001);
  await expect(page.getByRole('main').getByRole('alert')).toContainText('O tempo de espera terminou');
  await expect(page.getByRole('button', { name: 'Tentar novamente', exact: true })).toBeVisible();
  await expect(page.getByText('Buscando informações...', { exact: true })).toHaveCount(0);
});

test('biblioteca de POPs distingue indisponibilidade de lista vazia e permite tentar novamente', async ({ page }) => {
  let attempts = 0;
  await page.route('**/api/pop/documentos', async (route) => {
    if (attempts++ === 0) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Serviço documental temporariamente indisponível.' }) });
    else await route.continue();
  });
  await page.goto('/pop');
  const error = page.getByRole('main').getByRole('alert');
  await expect(error).toContainText('Serviço documental temporariamente indisponível');
  await error.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByText(/biblioteca de documentos anexados está indisponível: o banco não está configurado/i)).toBeVisible();
  await expect(page.getByRole('main').getByRole('alert')).toHaveCount(0);
  await expect(page.getByText(/Consultar o manual disponível/).first()).toBeVisible();
});

test('favoritar é explícito e limpar remove os dados locais', async ({ page }) => {
  await page.goto('/consulta?q=moto%20sem%20capacete');
  const save = page.getByRole('button', { name: 'Salvar', exact: true });
  await expect(save).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ctb-favoritos'))).toBeNull();
  await save.click();
  await expect(page.getByRole('button', { name: 'Salvo', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/favoritos');
  await expect(page.getByText(/data de salvamento não é a data de revisão/i)).toBeVisible();
  await page.getByRole('button', { name: 'Limpar tudo', exact: true }).click();
  await expect(page.getByText('Nenhum favorito ainda', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ctb-favoritos'))).toBeNull();
});
