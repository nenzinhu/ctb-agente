import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EnquadramentoGuiado from '@/components/EnquadramentoGuiado';
import { compartilharTexto } from '@/lib/share/send';

jest.mock('../../lib/share/send');

const fetchMock = jest.fn();
const compartilharMock = compartilharTexto as jest.MockedFunction<typeof compartilharTexto>;

describe('EnquadramentoGuiado', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    compartilharMock.mockReset();
    compartilharMock.mockResolvedValue('copiado');
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('consulta, exibe candidatos sem decidir e envia a resposta objetiva', async () => {
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: async () => ({
        decisaoAutomatica: false,
        contradicao: false,
        perguntas: [{ id: '763-32:quando_autuar:0', texto: 'O condutor digitava?', criterio: 'digitava', fonte: 'quando_autuar', codigos: ['763-32'] }],
        candidatos: [{ ficha: { codigo: '763-32', tipificacaoResumida: 'Dirigir manuseando telefone celular', amparoLegal: 'Art. 252', gravidade: 'Gravíssima', penalidade: 'Multa', medidaAdministrativa: '—', infrator: 'Condutor', competencia: 'Órgão de trânsito', pontuacao: '7 pontos', constatacao: 'Sem abordagem' }, pontuacao: 100, evidenciasFavoraveis: [], evidenciasContrarias: [], evidencias: [] }],
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

  it('compara em linhas e monta o fundamento após escolha manual', async () => {
    const ficha = (codigo: string, resumo: string, criterio: string) => ({
      codigo,
      tipificacaoResumida: resumo,
      tipificacao: resumo,
      amparoLegal: 'Art. 252 do CTB',
      gravidade: 'Gravíssima',
      penalidade: 'Multa',
      medidaAdministrativa: 'Nenhuma',
      configuraCrime: 'Não',
      infrator: 'Condutor',
      competencia: 'Órgão de trânsito',
      pontuacao: '7 pontos',
      constatacao: 'Possível sem abordagem',
      quandoAutuar: [criterio],
      quandoNaoAutuar: [],
      definicoes: [],
      exemplos: [],
      informacoesComplementares: [],
      pagina: 10,
    });
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({
      decisaoAutomatica: false,
      contradicao: false,
      perguntas: [],
      candidatos: [
        { ficha: ficha('763-31', 'Dirigir segurando telefone celular', 'Condutor segurava o aparelho.'), pontuacao: 100, evidenciasFavoraveis: ['Confirmado: Condutor segurava o aparelho.'], evidenciasContrarias: [], evidencias: [{ criterio: 'Condutor segurava o aparelho.', fonte: 'quando_autuar', resposta: 'sim', efeito: 'favoravel', descricao: 'Confirmado: Condutor segurava o aparelho.' }] },
        { ficha: ficha('763-32', 'Dirigir manuseando telefone celular', 'Condutor digitava no aparelho.'), pontuacao: 99, evidenciasFavoraveis: [], evidenciasContrarias: [], evidencias: [] },
      ],
    }) });

    render(<EnquadramentoGuiado />);
    await userEvent.type(screen.getByLabelText(/descreva a situação/i), 'condutor usando telefone celular');
    await userEvent.click(screen.getByRole('button', { name: /analisar situação/i }));

    expect(await screen.findByLabelText('Comparação entre infrações')).toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getAllByText('Elemento diferenciador')).toHaveLength(2);

    await userEvent.click(screen.getByRole('button', { name: 'Selecionar 763-31' }));
    const tituloFundamento = await screen.findByRole('heading', { name: 'Fundamento da atuação' });
    expect(tituloFundamento.closest('section')).toHaveAttribute('id', 'fundamento-impressao');
    expect(screen.getByLabelText('Comparação entre infrações').closest('section')).toHaveClass('print:hidden');
    expect(screen.getByText('MBFT — ficha 763-31, página 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copiar fundamento/i })).toBeInTheDocument();
    const compartilhar = screen.getByRole('button', { name: /compartilhar fundamento/i });
    expect(compartilhar.parentElement).toHaveClass('print:hidden');
    expect(screen.getByRole('button', { name: /imprimir fundamento/i })).toBeInTheDocument();

    await userEvent.click(compartilhar);
    expect(await screen.findByRole('status')).toHaveTextContent('Fundamento copiado.');
  });
});
