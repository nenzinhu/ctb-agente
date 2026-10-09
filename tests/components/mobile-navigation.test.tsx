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
    const buscar = screen.getByRole('link', { name: /buscar/i });
    expect(buscar).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: /ferramentas/i })).toHaveClass('mobile-nav-action');
    expect(screen.getByRole('link', { name: /favoritos/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mais/i })).toBeInTheDocument();
  });

  it('abre Ferramentas, fecha com Escape e devolve o foco ao acionador', async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    const trigger = screen.getByRole('button', { name: /ferramentas/i });
    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: /ferramentas/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /enquadramento guiado/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('fecha a folha ao clicar no fundo', async () => {
    const user = userEvent.setup();
    render(<MobileNavigation />);
    await user.click(screen.getByRole('button', { name: /mais/i }));
    expect(screen.getByRole('dialog', { name: /mais opções/i })).toBeInTheDocument();
    await user.click(screen.getByTestId('bottom-sheet-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
