import { fireEvent, render, screen } from '@testing-library/react';
import EstrangeirosConsulta from '@/components/estrangeiros/EstrangeirosConsulta';

describe('EstrangeirosConsulta', () => {
  it('oferece consulta livre e fiscalização guiada sem pedir dados pessoais', () => {
    render(<EstrangeirosConsulta />);

    expect(screen.getByRole('heading', { name: /consulta rápida/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/descreva a situação/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /fiscalização guiada/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/nome|cpf|passaporte|placa/i)).not.toBeInTheDocument();
  });

  it('mostra perguntas pendentes e alternativas em linhas visíveis', () => {
    render(<EstrangeirosConsulta />);
    fireEvent.change(screen.getByLabelText(/país emissor/i), { target: { value: 'AR' } });
    fireEvent.click(screen.getByRole('button', { name: /analisar situação/i }));

    expect(screen.getByRole('heading', { name: /dados que ainda precisam/i })).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /possíveis enquadramentos/i })).not.toBeInTheDocument();
  });
});
