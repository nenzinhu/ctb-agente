import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem('ctb-pmrv-splash-v1', '1');
    localStorage.setItem('ctb-reading-mode', 'scroll');
  });
});

test('limpa CTB, POPs e Estrangeiros sem enviar e devolve foco ao campo', async ({ page }) => {
  await page.route('**/api/sugestoes?**', r => r.fulfill({ json: { sugestoes: [] } }));
  for (const [route, name] of [['/', 'O que aconteceu?'], ['/pop', 'Sua pergunta sobre os POPs'], ['/estrangeiros', 'Descreva a situação']]) {
    await page.goto(route);
    const field = page.getByRole('textbox', { name, exact: true });
    await field.fill('art. 165');
    await page.getByRole('button', { name: 'Limpar pesquisa', exact: true }).click();
    await expect(field).toHaveValue('');
    await expect(field).toBeFocused();
    await expect(page.getByRole('button', { name: 'Limpar pesquisa', exact: true })).toHaveCount(0);
  }
});

test('login informa campos inválidos sem chamar autenticação e preserva senha após falha', async ({ page }) => {
  let posts = 0;
  await page.route('**/api/admin/login', r => {
    if (r.request().method() === 'POST') { posts++; return r.fulfill({ status: 401, json: { message: 'Credenciais inválidas.' } }); }
    return r.fulfill({ json: { configured: true, username: '' } });
  });
  await page.goto('/admin/login');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByLabel('Usuário', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Usuário', { exact: true })).toBeFocused();
  expect(posts).toBe(0);
  await page.getByLabel('Usuário', { exact: true }).fill('agente');
  await page.getByLabel('Senha', { exact: true }).fill('senha-ficticia');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText('Credenciais inválidas.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('senha-ficticia');
  expect(posts).toBe(1);
});
