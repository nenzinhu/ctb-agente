import { render, screen } from '@testing-library/react';

jest.mock('../../components/InstalarApp', () => () => <button>Instalar</button>);
jest.mock('../../components/TemaEscuroToggle', () => () => <button>Escuro</button>);
jest.mock('../../components/TemaToggle', () => () => <button>Modo sol</button>);

import userEvent from '@testing-library/user-event';

jest.mock('next/navigation', () => ({ usePathname: () => '/estrangeiros' }));

import Header from '@/components/Header';

describe('Header no mobile', () => {
  it('mantém três destinos diretos e agrupa ferramentas com indicação da rota ativa', async () => {
    const user = userEvent.setup();
    render(<Header />);
    expect(screen.getByRole('link', { name: /ctb agente — início/i })).toHaveClass('mobile-header-brand');
    expect(screen.getByTestId('desktop-navigation')).toHaveClass('hidden', 'md:block');
    expect(screen.getByRole('navigation', { name: /navegação principal/i }).querySelector('ul')).toHaveClass(
      'nav-tabs-compact',
    );
    expect(screen.getByRole('link', { name: 'Consultar CTB' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Consultar POPs' })).toHaveAttribute('href', '/pop');
    const trigger = screen.getByText('Ferramentas');
    await user.click(trigger);
    expect(screen.getByRole('heading', { name: 'Fiscalização' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /condutores e veículos estrangeiros/i })).toHaveAttribute('aria-current', 'page');
    await user.keyboard('{Escape}');
    expect(trigger.closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('link', { name: /enquadramento guiado/i })).not.toBeInTheDocument();
  });
});
