import { render, screen } from '@testing-library/react';
import ConsultaForm from '@/components/ConsultaForm';

jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
    };
  },
}));

/** The form's own submit button; the fixed bar repeats the label on phones. */
function botaoEnviar(): HTMLElement {
  const botao = screen
    .getAllByRole('button', { name: /Consultar/ })
    .find((elemento) => elemento.getAttribute('type') === 'submit');
  if (!botao) throw new Error('Botão de envio não encontrado');
  return botao;
}

describe('ConsultaForm', () => {
  it('renders textarea and button', () => {
    render(<ConsultaForm />);
    expect(screen.getByPlaceholderText(/Ex: 516-91/)).toBeInTheDocument();
    expect(botaoEnviar()).toBeInTheDocument();
  });

  it('disables button when textarea is empty', () => {
    render(<ConsultaForm />);
    expect(botaoEnviar()).toBeDisabled();
  });

  it('usa uma área de consulta compacta no mobile e mantém ação de toque grande', () => {
    render(<ConsultaForm />);
    expect(screen.getByLabelText('Sua consulta')).toHaveClass('mobile-query-field');
    expect(botaoEnviar()).toHaveClass('min-h-[48px]');
  });

  it('oferece a barra fixa do celular sem duplicar o campo de consulta', () => {
    render(<ConsultaForm />);
    const barra = screen.getByRole('group', { name: /campo de consulta/i });
    expect(barra).toHaveClass('barra-acao', 'md:hidden');
    // A barra aponta para o campo real em vez de criar um segundo textarea.
    expect(barra.querySelector('textarea')).toBeNull();
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });
});
