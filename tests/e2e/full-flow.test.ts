import { expect, test } from '@playwright/test';
import { ADMIN_PASSWORD, ADMIN_USER, BASE_POPULADA, CONSULTAS, TEMA_PDF } from './fixtures';

test.describe('CTB Agente — fluxo completo', () => {
  test('a home carrega com a navegação principal', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: 'CTB Agente' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar Consulta' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Gerar PDF/ })).toBeVisible();
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
    await page.getByRole('button', { name: 'Iniciar Consulta' }).click();

    await page.getByLabel('Sua consulta').fill('516-91');
    await page.getByRole('button', { name: 'Consultar' }).click();

    await page.waitForURL(/\/consulta\?q=/);
    await expect(page.getByRole('heading', { name: 'Resultado da Consulta' })).toBeVisible();
    await expect(page.getByText('516-91')).toBeVisible();
  });

  test('consultas recentes ficam salvas no aparelho', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar Consulta' }).click();
    await page.getByLabel('Sua consulta').fill('teste-e2e');
    await page.getByRole('button', { name: 'Consultar' }).click();
    await page.waitForURL(/\/consulta\?q=/);

    await page.goto('/');
    await page.getByRole('button', { name: 'Iniciar Consulta' }).click();
    await expect(page.getByText('teste-e2e')).toBeVisible();
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

  test('o admin protege o acesso e mostra o login', async ({ page }) => {
    await page.goto('/admin');

    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByText(/login/i).first()).toBeVisible();
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
      await expect(page.getByRole('heading', { name: /Painel Master/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Provedores de IA/ })).toBeVisible();
    });
  });
});
