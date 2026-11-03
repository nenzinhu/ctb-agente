import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { sessionStorage.setItem('ctb-pmrv-splash-v1', '1'); if (!localStorage.getItem('ctb-reading-mode')) localStorage.setItem('ctb-reading-mode', 'pages'); });
});

const routes = ['/pop', '/pesos-dimensoes', '/estrangeiros', '/fatos-pmsc', '/professor', '/apostila', '/comprimir-pdf', '/gerador-pdf', '/favoritos', '/enquadramento', '/casos', '/consulta', '/offline', '/admin/login', '/ferramentas'];

test('todas as páginas usam o painel fixo sem rolagem do documento', async ({ page }) => {
  for (const route of routes) {
    await page.goto(route);
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await expect(page.locator('.page-pagination')).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const frame = document.querySelector('.page-viewport-frame')!;
      const flow = document.querySelector('.page-viewport-flow')!;
      return document.documentElement.scrollHeight <= innerHeight && document.documentElement.scrollWidth <= innerWidth && flow.scrollHeight <= frame.clientHeight + 2;
    })).toBe(true);
  }
});

test('mantém o valor dos campos ao paginar e navegar por seções', async ({ page }) => {
  await page.goto('/pesos-dimensoes');
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const pagination = page.getByRole('navigation', { name: 'Páginas do conteúdo' });
  const next = page.getByRole('button', { name: 'Próxima página do conteúdo' });
  await expect(next).toBeEnabled();
  const field = page.getByLabel('PBT/PBTC do conjunto (kg)');
  await field.focus();
  await field.fill('22000');
  await next.click();
  await expect(pagination.getByRole('status')).not.toHaveText(/^1 \/ /);
  await page.getByRole('button', { name: 'Página anterior do conteúdo' }).click();
  await expect(field).toHaveValue('22000');
  await expect(page.getByRole('combobox', { name: 'Ir para uma seção' })).toBeVisible();
});

test('mantém acessível o final de um texto extenso recebido depois da consulta', async ({ page }) => {
  await page.route('**/api/consulta', route => route.fulfill({ json: { card: {
    tipo: 'artigo', sucesso: true, consulta: 'art. 165', enquadramento: null,
    normas: [{ numero_dispositivo: 'Art. de teste', texto: 'Texto ilustrativo usado para verificar a leitura completa por páginas. '.repeat(120) + 'FIM_DO_TEXTO_DE_TESTE', norma_id: 'teste', tipo: 'lei', vigente: true }],
    checklist_ait: [], erros_comuns: [], concurso_infracoes: [], crime_transito: false,
    categoria_cnh_exigida: '', normas_relacionadas: [], jurisprudencia: [], explicacao_simples: '', exemplo_dia_a_dia: '', citacoes: [], cache_hit: false, tempo_ms: 1,
  } } }));
  await page.goto('/consulta?q=art.%20165');
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const technical = page.getByRole('tab', { name: 'Técnico', exact: true });
  await technical.focus();
  await technical.press('Enter');
  await expect(technical).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText(/FIM_DO_TEXTO_DE_TESTE/)).toBeAttached();
  await expect.poll(() => page.locator('.page-pagination [role=status]').innerText()).not.toBe('1 / 1');
  let reachedEnd = false;
  for (let index = 0; index < 40; index++) {
    reachedEnd = await page.evaluate(() => {
      const paragraph = [...document.querySelectorAll('p')].find(el => el.textContent?.includes('FIM_DO_TEXTO_DE_TESTE'));
      const node = paragraph?.firstChild;
      if (!node?.textContent) return false;
      const start = node.textContent.indexOf('FIM_DO_TEXTO_DE_TESTE');
      const range = document.createRange();
      range.setStart(node, start + 20); range.setEnd(node, start + 21);
      const rect = range.getBoundingClientRect();
      const bounds = document.querySelector('.page-viewport-frame')!.getBoundingClientRect();
      return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.top >= bounds.top && rect.bottom <= bounds.bottom + 1;
    });
    if (reachedEnd) break;
    const next = page.getByRole('button', { name: 'Próxima página do conteúdo' });
    if (await next.isDisabled()) break;
    await next.click();
  }
  expect(reachedEnd).toBe(true);
});

test('opções de veículo continuam acessíveis sem uma lista com rolagem', async ({ page }) => {
  await page.goto('/pesos-dimensoes');
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const trigger = page.getByRole('button', { name: 'Selecionar configuração do veículo' });
  await trigger.focus();
  await trigger.press('Enter');
  const options = page.getByRole('listbox', { name: 'Configurações de veículo' }).getByRole('option');
  await expect(options.last()).toBeAttached();
  await options.last().focus();
  await expect.poll(() => options.last().evaluate(element => {
    const rect = element.getBoundingClientRect();
    const bounds = document.querySelector('.page-viewport-frame')!.getBoundingClientRect();
    return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1;
  })).toBe(true);
  await options.last().press('Enter');
  await expect(page.getByRole('listbox', { name: 'Configurações de veículo' })).not.toBeAttached();
});

test('setas laterais ficam transparentes e livres dos controles principais', async ({ page }) => {
  for (const route of ['/', '/pop', '/pesos-dimensoes', '/professor']) {
    await page.goto(route);
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await expect(page.getByRole('group', { name: 'Navegação lateral' })).toBeAttached();
    await expect(page.locator('.floating-page-arrow-next')).toBeVisible();
    await expect.poll(() => page.evaluate(() => {
      const buttons = [...document.querySelectorAll<HTMLButtonElement>('.floating-page-arrow')];
      const controls = [...document.querySelectorAll<HTMLElement>('#conteudo button,#conteudo input,#conteudo select,#conteudo textarea,#conteudo a[href]')].filter(el => !el.closest('.floating-page-arrows'));
      return buttons.every(button => {
        const r = button.getBoundingClientRect();
        return getComputedStyle(button).position === 'fixed' && (r.left < 10 || r.right > innerWidth - 10) && !controls.some(control => [...control.getClientRects()].some(c => c.width && c.height && c.left < r.right && c.right > r.left && c.top < r.bottom && c.bottom > r.top));
      });
    })).toBe(true);
  }
});

test('opção de rolar preserva campos e mantém as abas inferiores no lugar', async ({ page }) => {
  await page.goto('/pesos-dimensoes');
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const field = page.getByLabel('PBT/PBTC do conjunto (kg)');
  await field.focus();
  await field.fill('22000');
  await page.getByRole('button', { name: 'Rolar conteúdo central', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rolar conteúdo central', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(field).toHaveValue('22000');
  const nav = page.locator('.mobile-nav');
  const before = await nav.boundingBox();
  await page.locator('.page-viewport-frame').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await expect.poll(() => page.locator('.page-viewport-frame').evaluate(el => el.scrollTop)).toBeGreaterThan(100);
  if (await nav.isVisible()) expect((await nav.boundingBox())?.y).toBe(before?.y);
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight)).toBe(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Rolar conteúdo central', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Ler conteúdo por páginas', exact: true }).click();
  await expect(page.getByLabel('Conteúdo paginado')).toBeAttached();
});
