import { render, screen } from '@testing-library/react';

jest.mock('../../components/InstalarApp', () => () => <button>Instalar</button>);
jest.mock('../../components/TemaEscuroToggle', () => () => <button>Escuro</button>);
jest.mock('../../components/TemaToggle', () => () => <button>Modo sol</button>);

import Header from '@/components/Header';

describe('Header no mobile', () => {
  it('mantém a marca compacta e organiza os módulos em pilares', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /ctb agente — início/i })).toHaveClass('mobile-header-brand');
    expect(screen.getByRole('navigation', { name: /pilares operacionais/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /fiscalização/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /enquadramento guiado/i })).not.toBeInTheDocument();
  });
});
