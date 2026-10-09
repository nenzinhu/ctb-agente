import { render, screen } from '@testing-library/react';
import Home from '@/app/page';

jest.mock('next/navigation', () => ({
  useRouter() {
    return { push: jest.fn() };
  },
}));

describe('apresentação institucional da página inicial', () => {
  it('explica o propósito de campo e orienta a conferência oficial', () => {
    render(<Home />);

    expect(screen.getByText('Ferramenta operacional para agentes de campo')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Aplicativo de apoio ao agente em campo para consultar rapidamente o CTB, as fichas do MBFT e os POPs, esclarecer dúvidas e conferir a fonte oficial antes da atuação.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.',
      ),
    ).toBeInTheDocument();
  });
});
