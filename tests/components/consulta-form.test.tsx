import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsultaForm from '@/components/ConsultaForm';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: mockPush,
    };
  },
}));

describe('ConsultaForm', () => {
  beforeEach(() => mockPush.mockClear());

  it('interpreta um número como artigo quando o atalho Artigo está selecionado', async () => {
    const usuario = userEvent.setup();
    render(<ConsultaForm />);
    await usuario.click(screen.getByRole('button', { name: 'Artigo' }));
    await usuario.type(screen.getByLabelText('Sua consulta'), '165');
    await usuario.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(mockPush).toHaveBeenCalledWith('/consulta?q=art.%20165');
  });

  it('preserva o texto ao trocar atalhos e só consulta após o envio', async () => {
    const usuario = userEvent.setup();
    render(<ConsultaForm />);
    await usuario.type(screen.getByLabelText('Sua consulta'), 'motorista usando celular');
    await usuario.click(screen.getByRole('button', { name: 'Código' }));
    await usuario.click(screen.getByRole('button', { name: 'Palavra-chave' }));
    expect(screen.getByLabelText('Sua consulta')).toHaveValue('motorista usando celular');
    expect(screen.getByRole('button', { name: 'Palavra-chave' })).toHaveAttribute('aria-pressed', 'true');
    expect(mockPush).not.toHaveBeenCalled();
    await usuario.click(screen.getByRole('button', { name: 'Consultar' }));
    expect(mockPush).toHaveBeenCalledWith('/consulta?q=motorista%20usando%20celular');
  });

  it('mantém códigos sem prefixo e artigos completos intactos', async () => {
    const usuario = userEvent.setup();
    const { unmount } = render(<ConsultaForm />);
    await usuario.click(screen.getByRole('button', { name: 'Código' }));
    await usuario.type(screen.getByLabelText('Sua consulta'), '516-91{Enter}');
    expect(mockPush).toHaveBeenLastCalledWith('/consulta?q=516-91');
    unmount();
    render(<ConsultaForm />);
    await usuario.click(screen.getByRole('button', { name: 'Artigo' }));
    await usuario.type(screen.getByLabelText('Sua consulta'), 'art. 181, XX{Enter}');
    expect(mockPush).toHaveBeenLastCalledWith('/consulta?q=art.%20181%2C%20XX');
  });

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
