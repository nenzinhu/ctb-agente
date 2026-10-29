import { render, screen } from '@testing-library/react';

jest.mock('../../components/InstalarApp', () => () => <button>Instalar</button>);
jest.mock('../../components/TemaEscuroToggle', () => () => <button>Escuro</button>);
jest.mock('../../components/TemaToggle', () => () => <button>Modo sol</button>);

import Header from '@/components/Header';

describe('Header no mobile', () => {
  it('mantém a marca compacta e oferece os módulos também no celular', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /ctb agente — início/i })).toHaveClass('mobile-header-brand');
    expect(screen.getByRole('navigation', { name: /navegação principal/i }).closest('.header-strip')).not.toHaveClass('hidden');
    expect(screen.getByRole('navigation', { name: /navegação principal/i }).querySelector('ul')).toHaveClass(
      'nav-tabs-compact',
    );
    expect(screen.getByRole('link', { name: 'Lista de Fatos (PMSC Mobile)' })).toHaveTextContent(/^Fatos$/);
    expect(screen.getByRole('link', { name: 'Condutores e Veículos Estrangeiros' })).toHaveAttribute('href', '/estrangeiros');
    expect(screen.queryByRole('link', { name: /enquadramento guiado/i })).not.toBeInTheDocument();
  });
});
