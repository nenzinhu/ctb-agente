import { render, screen } from '@testing-library/react';

jest.mock('../../components/InstalarApp', () => () => <button>Instalar</button>);
jest.mock('../../components/TemaEscuroToggle', () => () => <button>Escuro</button>);
jest.mock('../../components/TemaToggle', () => () => <button>Modo sol</button>);

import Header from '@/components/Header';

describe('Header no mobile', () => {
  it('mantém a marca compacta e oferece os módulos também no celular', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /ctb agente — início/i })).toHaveClass('mobile-header-brand');
    expect(screen.getByRole('navigation', { name: /navegação principal/i }).closest('.header-strip')).toHaveClass('hidden', 'md:block');
    const atalhos = screen.getByRole('navigation', { name: /consultas rápidas/i });
    expect(atalhos).toHaveClass('md:hidden');
    expect(atalhos.querySelectorAll('a')).toHaveLength(3);
    expect(screen.queryByRole('link', { name: /enquadramento guiado/i })).not.toBeInTheDocument();
  });
});
