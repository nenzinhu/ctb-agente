import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const PAGINAS = [
  ['início', '/'],
  ['resultado CTB', '/consulta?q=516-91'],
  ['POP-PMSC', '/pop'],
  ['pesos e dimensões', '/pesos-dimensoes'],
  ['estrangeiros', '/estrangeiros'],
  ['fatos PMSC', '/fatos-pmsc'],
  ['enquadramento guiado', '/enquadramento'],
  ['professor', '/professor'],
  ['apostila', '/apostila'],
  ['gerador de PDF', '/gerador-pdf'],
  ['comprimir PDF', '/comprimir-pdf'],
  ['favoritos', '/favoritos'],
  ['offline', '/offline'],
  ['login administrativo', '/admin/login'],
] as const;

function relatorio(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .map((violacao) => `${violacao.id} (${violacao.impact}): ${violacao.help}\n${violacao.nodes.map((no) => `  ${no.target.join(' ')}`).join('\n')}`)
    .join('\n\n');
}

test.describe('Acessibilidade WCAG 2.2 AA', () => {
  test.use({ reducedMotion: 'reduce' });

  for (const [nome, rota] of PAGINAS) {
    test(`não há violações em ${nome}`, async ({ page }) => {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');

      const resultado = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(resultado.violations, relatorio(resultado.violations)).toEqual([]);
    });
  }

  test('as abas do resultado funcionam por teclado', async ({ page }) => {
    await page.goto('/consulta?q=516-91');

    const ficha = page.getByRole('tab', { name: 'Ficha de fiscalização' });
    await expect(ficha).toBeVisible();
    await expect(ficha).toHaveAttribute('aria-selected', 'true');
    await expect(ficha).toHaveAttribute('tabindex', '0');

    await ficha.focus();
    await page.keyboard.press('ArrowRight');

    const tecnico = page.getByRole('tab', { name: 'Técnico' });
    await expect(tecnico).toHaveAttribute('aria-selected', 'true');
    await expect(tecnico).toBeFocused();
    await expect(page.getByRole('tabpanel', { name: 'Técnico' })).toBeVisible();
    await expect(ficha).toHaveAttribute('tabindex', '-1');
  });

  test('os temas escuro e sol mantêm a acessibilidade', async ({ page }) => {
    await page.goto('/');

    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--ds-bg').trim() === '#101813');
    await page.waitForTimeout(150);
    const escuro = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(escuro.violations, `Tema escuro:\n${relatorio(escuro.violations)}`).toEqual([]);

    await page.evaluate(() => {
      document.documentElement.classList.remove('dark');
      document.documentElement.dataset.tema = 'sol';
    });
    await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--ds-bg').trim() === '#fff' || getComputedStyle(document.documentElement).getPropertyValue('--ds-bg').trim() === '#ffffff');
    await page.waitForTimeout(150);
    const sol = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(sol.violations, `Modo sol:\n${relatorio(sol.violations)}`).toEqual([]);
  });
});
