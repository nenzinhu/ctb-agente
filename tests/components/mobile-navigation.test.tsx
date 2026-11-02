import { render, screen } from '@testing-library/react';

let pathname = '/';
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));

import MobileNavigation from '@/components/mobile/MobileNavigation';

describe('MobileNavigation', () => {
  beforeEach(() => { pathname = '/'; });

  it('oferece os quatro acessos críticos para a pista', () => {
    pathname = '/consulta';
    render(<MobileNavigation />);
    const nav = screen.getByRole('navigation', { name: /navegação mobile/i });
    expect(nav).toHaveClass('mobile-nav-compact');
    expect(screen.getByRole('link', { name: /buscar/i })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /pesos/i })).toHaveAttribute('href', '/pesos-dimensoes');
    expect(screen.getByRole('link', { name: /estrangeiros/i })).toHaveAttribute('href', '/estrangeiros');
    expect(screen.getByRole('link', { name: /favoritos/i })).toHaveAttribute('href', '/favoritos');
    expect(nav.querySelectorAll('a')).toHaveLength(4);
  });

  it('marca pesos e estrangeiros conforme a rota ativa', () => {
    pathname = '/estrangeiros';
    const { rerender } = render(<MobileNavigation />);
    expect(screen.getByRole('link', { name: /estrangeiros/i })).toHaveAttribute('aria-current', 'page');
    pathname = '/pesos-dimensoes';
    rerender(<MobileNavigation />);
    expect(screen.getByRole('link', { name: /pesos/i })).toHaveAttribute('aria-current', 'page');
  });
});
