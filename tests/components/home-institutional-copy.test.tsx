import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
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

    expect(screen.getByRole('heading', { level: 1, name: 'Consultar CTB' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Como pesquisar' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('textbox', { name: 'O que aconteceu?' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.',
      ),
    ).toBeInTheDocument();
  });
});
