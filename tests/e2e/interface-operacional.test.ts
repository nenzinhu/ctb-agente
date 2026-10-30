import { expect, test } from '@playwright/test';

test('preserva a entrada ao aguardar o campo ficar pronto para digitar', async ({ page }) => {
  let release!: () => void;
  const scripts = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/_next/static/**/*.js', async (route) => {
    await scripts;
    await route.continue().catch(() => {});
  });
  try {
    await page.goto('/', { waitUntil: 'commit' });
    await expect(page.getByLabel('Sua consulta', { exact: true })).toBeDisabled();
  } finally { release(); }
  const field = page.getByLabel('Sua consulta', { exact: true });
  await field.fill('165');
  await page.getByRole('button', { name: 'Código', exact: true }).click();
  await expect(field).toHaveValue('165');
});

test('mostra campo e botão de consulta na primeira tela do celular', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/');
  const botao = page.getByRole('button', { name: 'Consultar', exact: true });
  await expect(botao).toBeVisible();
  const caixa = await botao.boundingBox();
  expect(caixa!.y + caixa!.height).toBeLessThanOrEqual(736);
});

for (const width of [320, 360, 390]) {
  test(`descobre todos os módulos sem rolagem lateral em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/');
    const atalhos = page.getByRole('navigation', { name: 'Consultas rápidas', exact: true });
    for (const nome of ['Consulta CTB', 'POP-PMSC', 'Lista de Fatos (PMSC Mobile)']) {
      await expect(atalhos.getByRole('link', { name: nome, exact: true })).toBeVisible();
    }
    const trigger = page.getByRole('button', { name: 'Todos os módulos', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Todos os módulos', exact: true });
    for (const href of ['/', '/pop', '/fatos-pmsc', '/pesos-dimensoes', '/estrangeiros',
      '/favoritos', '/apostila', '/professor', '/casos', '/gerador-pdf', '/comprimir-pdf']) {
      const link = dialog.locator(`a[href="${href}"]`);
      await link.scrollIntoViewIfNeeded();
      await expect(link).toBeVisible();
      const caixa = await link.boundingBox();
      expect(caixa!.height).toBeGreaterThanOrEqual(44);
      expect(caixa!.x + caixa!.width).toBeLessThanOrEqual(width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('dialog').locator('a[href="/favoritos"]').click();
    await expect(page).toHaveURL(/\/favoritos$/);
    await expect(page.getByRole('navigation', { name: 'Navegação mobile', exact: true })
      .getByRole('link', { name: 'Favoritos', exact: true })).toHaveAttribute('aria-current', 'page');
  });
}

test('mantém pills e página ativa no tablet', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/favoritos');
  const navegacao = page.getByRole('navigation', { name: 'Navegação principal', exact: true });
  await expect(navegacao).toBeVisible();
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
