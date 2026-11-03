import { render, screen } from '@testing-library/react';

jest.mock('../../components/InstalarApp', () => () => <button>Instalar</button>);
jest.mock('../../components/TemaEscuroToggle', () => () => <button>Escuro</button>);
jest.mock('../../components/TemaToggle', () => () => <button>Modo sol</button>);


jest.mock('next/navigation', () => ({ usePathname: () => '/estrangeiros' }));

import Header from '@/components/Header';

describe('Header no mobile', () => {
  it('mantém três destinos diretos e agrupa ferramentas com indicação da rota ativa', async () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /ctb agente — início/i })).toHaveClass('mobile-header-brand');
    expect(screen.getByTestId('desktop-navigation')).toHaveClass('hidden', 'md:block');
    expect(screen.getByRole('navigation', { name: /navegação principal/i }).querySelector('ul')).toHaveClass(
      'nav-tabs-compact',
    );
    expect(screen.getByRole('link', { name: 'Consultar CTB' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Consultar POPs' })).toHaveAttribute('href', '/pop');
    expect(screen.getByRole('link', { name: 'Ferramentas' })).toHaveAttribute('href', '/ferramentas');
    expect(screen.getByRole('link', { name: 'Ferramentas' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByRole('link', { name: /enquadramento guiado/i })).not.toBeInTheDocument();
  });
});
