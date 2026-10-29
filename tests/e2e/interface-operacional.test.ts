import { expect, test } from '@playwright/test';

test('mostra campo e botão de consulta na primeira tela do celular', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const botao = page.getByRole('button', { name: 'Consultar', exact: true });
  await expect(botao).toBeVisible();
  const caixa = await botao.boundingBox();
  expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(736);
});

test('mantém a navegação por pills acessível em telas estreitas', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal', exact: true });
  for (const nome of ['Consulta CTB', 'POP-PMSC', 'Lista de Fatos (PMSC Mobile)', 'Pesos e Dimensões',
    'Condutores e Veículos Estrangeiros', 'Favoritos', 'Apostila IA']) {
    const pill = navegacao.getByRole('link', { name: nome, exact: true });
    await pill.scrollIntoViewIfNeeded();
    await expect(pill).toBeVisible();
    const caixa = await pill.boundingBox();
    expect(caixa!.height).toBeGreaterThanOrEqual(44);
  }
  await navegacao.getByRole('link', { name: 'Favoritos', exact: true }).click();
  await expect(page).toHaveURL(/\/favoritos$/);
  await expect(navegacao.getByRole('link', { name: 'Favoritos', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('envia artigo numérico e mantém a consulta ao trocar de atalho', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Sua consulta', { exact: true }).fill('165');
  await page.getByRole('button', { name: 'Código', exact: true }).click();
  await expect(page.getByLabel('Sua consulta', { exact: true })).toHaveValue('165');
  await page.getByRole('button', { name: 'Artigo', exact: true }).click();
  await page.getByRole('button', { name: 'Consultar', exact: true }).click();
  await expect(page).toHaveURL(/\/consulta\?q=art\.%20165$/);
});

test('persiste tema escuro e mantém a precedência do modo sol', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  await page.getByRole('button', { name: 'Modo escuro', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Modo escuro', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(11, 18, 32)');
  await page.getByRole('button', { name: 'Modo sol', exact: true }).click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.reload();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(page.getByRole('button', { name: 'Modo sol: ativo', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('preserva o manifesto instalável do PWA', async ({ request }) => {
  const resposta = await request.get('/manifest.json');
  expect(resposta.ok()).toBe(true);
  const manifesto = await resposta.json();
  expect(manifesto.display).toBe('standalone');
  expect(manifesto.start_url).toBe('/');
  for (const icone of manifesto.icons) {
    expect((await request.get(icone.src)).ok()).toBe(true);
  }
});
