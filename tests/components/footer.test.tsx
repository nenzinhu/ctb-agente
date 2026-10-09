import { render, screen } from '@testing-library/react';
import Footer from '@/components/Footer';

describe('Footer', () => {
  it('apresenta o crédito e a orientação operacional em um rodapé semântico', () => {
    render(<Footer />);

    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('CTB Agente — desenvolvido pelo Cabo Jeferson');
    expect(footer).toHaveTextContent(/apoio à consulta/i);
    expect(footer).toHaveTextContent(/fonte vigente/i);
  });
});
