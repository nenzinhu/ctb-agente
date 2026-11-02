import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

jest.mock('next/navigation', () => ({
  useRouter() {
    return { push: jest.fn() };
  },
}));

beforeAll(() => {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
});

describe('apresentação institucional da página inicial', () => {
  it('explica o propósito de campo e orienta a conferência oficial', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { level: 1, name: 'Consultar infrações e artigos' })).toBeInTheDocument();
    expect(screen.getByText('Como pesquisar').closest('details')).not.toHaveAttribute('open');
    expect(screen.getByRole('textbox', { name: 'Sua consulta' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.',
      ),
    ).toBeInTheDocument();
  });
});
