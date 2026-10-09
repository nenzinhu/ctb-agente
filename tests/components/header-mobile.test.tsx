import { render, screen } from '@testing-library/react';

jest.mock('../../components/InstalarApp', () => () => <button>Instalar</button>);
jest.mock('../../components/TemaEscuroToggle', () => () => <button>Escuro</button>);
jest.mock('../../components/TemaToggle', () => () => <button>Modo sol</button>);

import Header from '@/components/Header';

describe('Header no mobile', () => {
  it('mantém a marca compacta e deixa as abas completas somente para desktop', () => {
    render(<Header />);
    expect(screen.getByRole('link', { name: /ctb agente — início/i })).toHaveClass('mobile-header-brand');
    expect(screen.getByTestId('desktop-navigation')).toHaveClass('hidden', 'md:block');
  });
});
