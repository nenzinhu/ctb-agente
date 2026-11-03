import { render, screen } from '@testing-library/react';
let pathname = '/';
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));
import MobileNavigation from '@/components/mobile/MobileNavigation';

describe('MobileNavigation', () => {
  it('mantém quatro destinos e indica a consulta ativa', () => {
    pathname = '/consulta';
    render(<MobileNavigation />);
    expect(screen.getByRole('link', { name: 'Consultar' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'POPs' })).toHaveAttribute('href', '/pop');
    expect(screen.getByRole('link', { name: 'Salvos' })).toHaveAttribute('href', '/favoritos');
    expect(screen.getByRole('link', { name: 'Ferramentas' })).toHaveAttribute('href', '/ferramentas');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('indica as ferramentas durante uma tarefa', () => {
    pathname = '/estrangeiros';
    render(<MobileNavigation />);
    expect(screen.getByRole('link', { name: 'Ferramentas' })).toHaveAttribute('aria-current', 'page');
  });
  it('preserva a navegação própria da administração', () => {
    pathname = '/admin';
    render(<MobileNavigation />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
