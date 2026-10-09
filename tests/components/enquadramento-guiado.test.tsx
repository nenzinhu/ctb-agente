import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnquadramentoGuiado from '@/components/EnquadramentoGuiado';

const fetchMock = jest.fn();

describe('EnquadramentoGuiado', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('consulta, exibe candidatos sem decidir e envia a resposta objetiva', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        decisaoAutomatica: false,
        contradicao: false,
        perguntas: [{ id: '763-32:quando_autuar:0', texto: 'O condutor digitava?', criterio: 'digitava', fonte: 'quando_autuar', codigos: ['763-32'] }],
        candidatos: [{ ficha: { codigo: '763-32', tipificacaoResumida: 'Dirigir manuseando telefone celular', amparoLegal: 'Art. 252', gravidade: 'Gravíssima', penalidade: 'Multa', medidaAdministrativa: '—', infrator: 'Condutor', competencia: 'Órgão de trânsito', pontuacao: '7 pontos', constatacao: 'Sem abordagem' }, pontuacao: 100, evidenciasFavoraveis: [], evidenciasContrarias: [] }],
      }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ decisaoAutomatica: false, contradicao: false, perguntas: [], candidatos: [] }) });

    render(<EnquadramentoGuiado />);
    await userEvent.type(screen.getByLabelText(/descreva a situação/i), 'condutor digitava no celular');
    await userEvent.click(screen.getByRole('button', { name: /analisar situação/i }));

    expect(await screen.findByText('763-32')).toBeInTheDocument();
    expect(screen.getByText(/não seleciona automaticamente/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sim' }));
    expect(fetchMock).toHaveBeenLastCalledWith('/api/enquadramento-guiado', expect.objectContaining({
      body: expect.stringContaining('"763-32:quando_autuar:0":"sim"'),
    }));
  });
});
