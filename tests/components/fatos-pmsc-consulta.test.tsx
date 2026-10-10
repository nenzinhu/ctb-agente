import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FatosPmscConsulta from '@/components/fatos-pmsc/FatosPmscConsulta';

const fetchMock = jest.fn();

describe('FatosPmscConsulta', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('mostra alternativas para conferência sem selecionar uma decisão', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({
      decisaoAutomatica: false,
      alternativas: [
        { grupo: 'Perturbação', natureza: 'Perturbação do trabalho ou sossego alheios', potencialOfensivo: 'Menor', pagina: 22, versao: '10/06/2019', compatibilidade: 'mais compatível', scoreConfianca: 98, metodoEncontrado: 'giria_exata' },
        { grupo: 'Perturbação', natureza: 'Perturbação da tranquilidade', potencialOfensivo: 'Menor', pagina: 22, versao: '10/06/2019', compatibilidade: 'alternativa próxima', scoreConfianca: 80, metodoEncontrado: 'contexto_lexical' },
      ],
    }) });

    render(<FatosPmscConsulta />);
    await userEvent.type(screen.getByLabelText(/descreva o fato/i), 'som alto na casa do vizinho');
    await userEvent.click(screen.getByRole('button', { name: /consultar lista/i }));

    expect(await screen.findByText('Perturbação do trabalho ou sossego alheios')).toBeInTheDocument();
    expect(screen.getByText('Perturbação da tranquilidade')).toBeInTheDocument();
    expect(screen.getByText(/confira as alternativas/i)).toBeInTheDocument();
    expect(screen.getByText(/atualizada em 10\/06\/2019/i)).toBeInTheDocument();
    expect(screen.getByText(/98%.*gíria exata/i)).toBeInTheDocument();
    expect(screen.queryByText(/^Página\s+22$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: /naturezas encontradas/i })).toHaveClass('mobile-results-enter');
    expect(screen.getByText('Perturbação do trabalho ou sossego alheios').closest('article')).toHaveClass('mobile-result-card');
  });
});
