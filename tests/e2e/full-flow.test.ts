import { expect, test } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USER, BASE_POPULADA, CONSULTAS, TEMA_PDF, pdfDeTeste } from './fixtures';

test.describe('CTB Agente — fluxo completo', () => {
  test('a home carrega com a navegação principal', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'CTB Agente' })).toBeVisible();
    await expect(page.getByLabel('O que aconteceu?')).toBeVisible();
    await expect(page.getByRole('link', { name: /POP-PMSC.*procedimentos/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Gerar apostila/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Comprimir PDF.*somente texto/i })).toBeVisible();
  });

  test('a apresentação institucional cabe em tela pequena', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/');

    await expect(page.getByText(/Aplicativo de apoio ao agente em campo/)).toBeVisible();
    await expect(page.getByText('CTB Agente — desenvolvido pelo Cabo Jeferson')).toBeVisible();
    const semRolagemHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(semRolagemHorizontal).toBe(true);
  });

  test('movimento reduzido mantém a consulta visível e utilizável', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.reload();

    const campo = page.getByLabel('O que aconteceu?');
    await expect(campo).toBeVisible();
    await campo.fill('art. 165');
    await expect(campo).toHaveValue('art. 165');
  });

  test('o rodapé é global e a animação fica restrita à home', async ({ page }) => {
    await page.goto('/apostila');

    await expect(page.getByText('CTB Agente — desenvolvido pelo Cabo Jeferson')).toBeVisible();
    await expect(page.locator('[data-home-reveal]')).toHaveCount(0);
  });

  test('gera apostila por páginas em tela pequena', async ({ page }) => {
    const documento = {
      id: '11111111-1111-4111-8111-111111111111',
      titulo: 'Manual operacional de teste',
      colecao: 'pop',
      paginas: 12,
      paginaMaximaDisponivel: 12,
      trechos: 4,
      situacao: 'revisar',
    };
    await page.route('**/api/apostila*', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          json: {
            titulo: 'Apostila — Manual operacional de teste',
            selecaoRotulo: 'páginas 2–3',
            documento,
            capitulos: [{
              id: 'cap-1',
              titulo: 'Parte 1 — Manual operacional de teste',
              texto: '## Objetivos\n- Consultar a fonte.',
              paginas: [2, 3],
              situacao: 'revisar',
              modelo: null,
            }],
          },
        });
        return;
      }
      await route.fulfill({ json: { documentos: [documento], bancoConfigurado: true } });
    });

    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/apostila');
    await page.getByLabel('Manual operacional de teste').click();
    await expect(page.getByLabel('Agentes')).toBeChecked();
    await page.getByLabel('Páginas selecionadas').click();
    await page.getByLabel('Intervalos de páginas').fill('2-3');
    await page.getByRole('button', { name: 'Gerar apostila' }).click();

    await expect(page.getByRole('heading', { name: 'Prévia' })).toBeVisible();
    await expect(page.getByText(/páginas 2–3/i).first()).toBeVisible();
    const semRolagemHorizontal = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(semRolagemHorizontal).toBe(true);
  });

  test('o modo sol pode ser alternado e persiste', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: /Modo sol/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'sol');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'sol');
  });

  test('o formulário leva para a página de resultado', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('O que aconteceu?').fill('516-91');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();

    await page.waitForURL(/\/consulta\?q=/);
    await expect(page.getByRole('heading', { name: 'Resultado da Consulta' })).toBeVisible();
    await expect(page.getByText('516-91').first()).toBeVisible();
  });

  test('consultas recentes ficam salvas no aparelho', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('O que aconteceu?').fill('teste-e2e');
    await page.getByRole('button', { name: 'Consultar', exact: true }).click();
    await page.waitForURL(/\/consulta\?q=/);

    await page.goto('/');
    await expect(page.getByRole('button', { name: 'teste-e2e' })).toBeVisible();
  });

  test('a página de PDF mostra temas e seções', async ({ page }) => {
    await page.goto('/gerador-pdf');

    await expect(page.getByRole('heading', { name: /Gerar Dossiê em PDF/ })).toBeVisible();
    await expect(page.getByLabel('Tema')).toBeVisible();
    await expect(page.getByLabel(/Jurisprudência/)).toBeVisible();
  });

  test('gera o dossiê em PDF (renderer real)', async ({ page }) => {
    // Works with an empty corpus too: the dossiê renders the sections it has
    await page.goto('/gerador-pdf');
    await page.getByLabel('Tema').selectOption(TEMA_PDF);

    const download = page.waitForEvent('download', { timeout: 30_000 });
    await page.getByRole('button', { name: 'Baixar PDF' }).click();

    const arquivo = await download;
    expect(arquivo.suggestedFilename()).toBe(`ctb-${TEMA_PDF}.pdf`);
  });

  test('a aba POP-PMSC abre a consulta e a biblioteca', async ({ page }) => {
    await page.goto('/pop');

    await expect(page.getByRole('heading', { name: 'POP-PMSC' })).toBeVisible();
    await expect(page.getByLabel('Sua pergunta sobre os POPs')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Biblioteca de POPs' })).toBeVisible();
  });

  test('comprime um PDF para somente texto no navegador', async ({ page }) => {
    await page.goto('/comprimir-pdf');

    await expect(page.getByRole('radio', { name: /Máxima — somente texto/ })).toBeChecked();
    await page.getByLabel('Selecionar PDF').setInputFiles({
      name: 'teste.pdf',
      mimeType: 'application/pdf',
      buffer: pdfDeTeste('Condutor flagrado sem cinto de seguranca'),
    });
    await page.getByRole('button', { name: 'Comprimir PDF', exact: true }).click();

    await expect(page.getByRole('heading', { name: 'PDF comprimido' })).toBeVisible({ timeout: 20_000 });
    const download = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar .txt' }).click();
    const arquivo = await download;
    expect(arquivo.suggestedFilename()).toBe('teste.txt');
  });

  test('o admin protege o acesso e mostra o login', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole('heading', { name: 'Entrar no painel' })).toBeVisible();
  });

  test('o healthcheck responde', async ({ request }) => {
    const resposta = await request.get('/api/health');
    expect([200, 503]).toContain(resposta.status());

    const corpo = await resposta.json();
    expect(corpo).toHaveProperty('status');
    expect(corpo).toHaveProperty('provedoresConfigurados');
  });

  test.describe('com base populada', () => {
    test.skip(!BASE_POPULADA, 'Requer E2E_SEEDED=1, migrations aplicadas e npm run seed');

    for (const consulta of CONSULTAS) {
      test(`retorna cartão para ${consulta.descricao}`, async ({ page }) => {
        await page.goto(`/consulta?q=${encodeURIComponent(consulta.input)}`);

        await expect(page.getByText('Resultado da Consulta')).toBeVisible();

        if (consulta.codigoEsperado) {
          await expect(page.getByText(consulta.codigoEsperado).first()).toBeVisible({
            timeout: 15_000,
          });
          await expect(page.getByText(/Checklist do AIT/)).toBeVisible();
        }
      });
    }

    test('o login do master abre o painel', async ({ page }) => {
      test.skip(!ADMIN_PASSWORD, 'Defina E2E_ADMIN_PASSWORD para testar o login');

      await page.goto('/admin/login');
      await page.getByLabel(/usuário|username/i).fill(ADMIN_USER);
      await page.getByLabel(/senha|password/i).fill(ADMIN_PASSWORD);
      await page.getByRole('button', { name: /entrar|login/i }).click();

      await page.waitForURL(/\/admin$/);
      await expect(page.getByRole('heading', { name: /Painel administrativo/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Provedores de IA/ })).toBeVisible();
    });
  });
});
