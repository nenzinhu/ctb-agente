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
        { grupo: 'Perturbação', natureza: 'Perturbação do trabalho ou sossego alheios', potencialOfensivo: 'Menor', pagina: 22, versao: '10/06/2019', compatibilidade: 'mais compatível' },
        { grupo: 'Perturbação', natureza: 'Perturbação da tranquilidade', potencialOfensivo: 'Menor', pagina: 22, versao: '10/06/2019', compatibilidade: 'alternativa próxima' },
      ],
    }) });

    render(<FatosPmscConsulta />);
    await userEvent.type(screen.getByLabelText(/descreva o fato/i), 'som alto na casa do vizinho');
    await userEvent.click(screen.getByRole('button', { name: /consultar lista/i }));

    expect(await screen.findByText('Perturbação do trabalho ou sossego alheios')).toBeInTheDocument();
    expect(screen.getByText('Perturbação da tranquilidade')).toBeInTheDocument();
    expect(screen.getByText(/confira as alternativas/i)).toBeInTheDocument();
    expect(screen.getByText(/atualizada em 10\/06\/2019/i)).toBeInTheDocument();
  });
});
