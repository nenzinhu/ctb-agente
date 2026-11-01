import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let pathname = '/';
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));

import MobileNavigation from '@/components/mobile/MobileNavigation';

describe('MobileNavigation', () => {
  beforeEach(() => { pathname = '/'; });

  it('oferece os quatro destinos com alvos de toque e marca Buscar na consulta', () => {
    pathname = '/consulta';
    render(<MobileNavigation />);
    expect(screen.getByRole('navigation', { name: /navegação mobile/i })).toHaveClass('mobile-nav-compact');
    const buscar = screen.getByRole('link', { name: /buscar/i });
    expect(buscar).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /todos os módulos/i })).toHaveClass('mobile-nav-action');
    expect(screen.getByRole('link', { name: /favoritos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recentes/i })).toBeInTheDocument();
  });

  it('abre todos os módulos, fecha com Escape e devolve o foco ao acionador', async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /todos os módulos/i });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: /todos os módulos/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /enquadramento guiado/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /consulta ctb/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('fecha a folha ao clicar no fundo', async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    await user.click(screen.getByRole('button', { name: /recentes/i }));
    expect(screen.getByRole('dialog', { name: /consultas recentes/i })).toBeInTheDocument();
    await user.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('oferece a fiscalização de estrangeiros nas ferramentas', async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    await user.click(screen.getByRole('button', { name: /todos os módulos/i }));
    expect(screen.getByRole('link', { name: /condutores e veículos estrangeiros/i })).toHaveAttribute('href', '/estrangeiros');
    for (const href of ['/casos', '/gerador-pdf', '/comprimir-pdf', '/favoritos', '/apostila']) {
      expect(screen.getByRole('dialog').querySelector(`a[href="${href}"]`)).toBeInTheDocument();
    }
  });
});

it('marca o módulo ativo dentro da lista completa', async () => {
  pathname = '/casos';
  render(<MobileNavigation />);
  await userEvent.click(screen.getByRole('button', { name: /todos os módulos/i }));
  expect(screen.getByRole('link', { name: /casos práticos/i })).toHaveAttribute('aria-current', 'page');
});

it('mantém o foco dentro do diálogo e restaura ao fechar', async () => {
  pathname = '/';
  const user = userEvent.setup();
  render(<MobileNavigation />);
  const trigger = screen.getByRole('button', { name: /todos os módulos/i });
  await user.click(trigger);
  const close = screen.getByRole('button', { name: 'Fechar Todos os módulos' });
  close.focus();
  await user.tab({ shift: true });
  expect(screen.getByRole('link', { name: /comprimir pdf/i })).toHaveFocus();
  await user.tab();
  expect(close).toHaveFocus();
  await user.click(close);
  await waitFor(() => expect(trigger).toHaveFocus());
  expect(document.body.style.overflow).toBe('');
});
