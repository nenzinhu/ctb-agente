import { fireEvent, render, screen } from '@testing-library/react';
import ConsultaForm from '@/components/ConsultaForm';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter() {
    return { push };
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

  it('suggests related infractions for slang, instantly, and opens the chosen one', () => {
    render(<ConsultaForm />);
    fireEvent.change(screen.getByLabelText('Sua consulta'), { target: { value: 'recusou o bafômetro' } });
    expect(screen.getByText(/Você quis dizer: Álcool ou droga ao volante/)).toBeInTheDocument();
    expect(screen.getByText(/Explicando fácil/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /757-90/ }));
    expect(push).toHaveBeenCalledWith('/consulta?q=757-90');
  });
});
