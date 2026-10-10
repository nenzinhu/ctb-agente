import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CalculadoraPesos from '@/components/pesos-dimensoes/CalculadoraPesos';
import PerguntasPesos from '@/components/pesos-dimensoes/PerguntasPesos';

const fetchMock = jest.fn();

const respostaCalculo = {
  configuracao: { id: 'truck-3-eixos', nome: 'Caminhão truck — 3 eixos', quantidadeEixos: 3 },
  limite: {
    status: 'conclusivo', limiteKg: 23000, fatorDeterminante: 'legal', capacidadeCargaKg: 14000,
    faltantes: [], fontes: [{ documento: 'Resolução CONTRAN nº 882/2021', artigo: 'Art. 6º', pagina: 3 }],
  },
  fiscalizacao: {
    status: 'autuavel', pesoApuradoKg: 23001, limiteFiscalizacaoKg: 23000,
    excessoTotalKg: 1, excessoEixosKg: 0, excessoCmtKg: 0, codigos: ['683-11'],
    valorPesoCentavos: 13548, valorCmtCentavos: 0, valorTotalCentavos: 13548,
    responsavelProvavel: 'Embarcador e transportador, solidariamente',
    providencias: ['Reter para transbordo da carga excedente antes de prosseguir a viagem.'],
    faltantes: [], fontes: [{ documento: 'Resolução CONTRAN nº 882/2021', artigo: 'Art. 49', pagina: 14 }],
  },
};

describe('Página de pesos e dimensões', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('converte entrada brasileira, calcula por nota e mostra resultado completo', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => respostaCalculo });
    render(<CalculadoraPesos />);

    await userEvent.type(screen.getByLabelText(/tara do conjunto/i), '9.000');
    await userEvent.type(screen.getByLabelText(/pbt\/pbtc técnico/i), '23.000');
    await userEvent.type(screen.getByLabelText(/comprimento total/i), '10');
    await userEvent.type(screen.getByLabelText(/peso da carga na nota/i), '14.001');
    await userEvent.click(screen.getByRole('button', { name: /calcular fiscalização/i }));

    expect(await screen.findByText('683-11')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 135,48').length).toBeGreaterThan(0);
    expect(screen.getByText(/embarcador e transportador/i)).toBeInTheDocument();
    expect(screen.getByText(/Art\. 49/)).toBeInTheDocument();
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.limite).toMatchObject({ taraKg: 9000, pbtTecnicoKg: 23000, comprimentoM: 10 });
    expect(payload.fiscalizacao.pesoCargaDocumentoKg).toBe(14001);
  });

  it('troca para balança e exibe campos por grupo de eixo', async () => {
    render(<CalculadoraPesos />);
    await userEvent.click(screen.getByRole('radio', { name: /balança/i }));
    expect(screen.queryByLabelText(/peso da carga na nota/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/peso total aferido/i)).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /eixo dianteiro/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /tandem traseiro/i })).toBeInTheDocument();
  });

  it('consulta o professor de pesos e mantém as fontes visíveis', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({
      origem: 'fontes-oficiais', resposta: 'A tolerância de balança é de 5% sobre o PBT.',
      fontes: [{ id: 'x', documento: 'Resolução CONTRAN nº 882/2021', referencia: 'Art. 50', pagina: 14, texto: '5%' }],
    }) });
    render(<PerguntasPesos />);
    await userEvent.type(screen.getByLabelText(/dúvida sobre pesos/i), 'Qual a tolerância?');
    await userEvent.click(screen.getByRole('button', { name: /consultar fontes/i }));
    expect(await screen.findByText(/tolerância de balança é de 5%/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Art\. 50.*p\. 14/i)).toBeInTheDocument());
  });
});
