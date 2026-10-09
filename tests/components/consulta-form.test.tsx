import { render, screen } from '@testing-library/react';
import ConsultaForm from '@/components/ConsultaForm';

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    };
  },
}));

describe('ConsultaForm', () => {
  it('renders textarea and button', () => {
    render(<ConsultaForm />);
    expect(screen.getByPlaceholderText(/Ex: 516-91/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Consultar/ })).toBeInTheDocument();
  });

  it('disables button when textarea is empty', () => {
    render(<ConsultaForm />);
    const button = screen.getByRole('button', { name: /Consultar/ });
    expect(button).toBeDisabled();
  });

  it('usa uma área de consulta compacta no mobile e mantém ação de toque grande', () => {
    render(<ConsultaForm />);
    expect(screen.getByLabelText('Sua consulta')).toHaveClass('mobile-query-field');
    expect(screen.getByRole('button', { name: /Consultar/ })).toHaveClass('min-h-[48px]');
  });
});
