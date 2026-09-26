import { fireEvent, render, screen } from '@testing-library/react';
import ConsultaResult from '@/components/ConsultaResult';
import { CartaoEstruturado } from '@/lib/response/response-types';

const mockCard: CartaoEstruturado = {
  tipo: 'codigo',
  sucesso: true,
  consulta: '516-91',
  normas: [
    {
      numero_dispositivo: 'art. 181 XVII',
      texto: 'Art. 181. Estacionar o veículo...',
      norma_id: 'ctb-lei-9503-97',
      tipo: 'lei',
      vigente: true,
    },
  ],
  cache_hit: false,
  tempo_ms: 42,
  enquadramento: {
    id: '1',
    codigo_mbft: '516-91',
    desdobramento: 0,
    descricao: 'Estacionar em local proibido',
    amparo_legal: 'art. 181, inciso XVII do CTB',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF 2026',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'crlv',
    medida_administrativa: 'Remoção obrigatória',
    responsavel: 'proprietario',
    criado_em: new Date().toISOString(),
  },
  checklist_ait: ['[ ] Fotografar o veículo'],
  erros_comuns: ['❌ Sem fotografia da sinalização'],
  concurso_infracoes: [],
  crime_transito: false,
  categoria_cnh_exigida: 'qualquer',
  normas_relacionadas: [],
  jurisprudencia: [],
  explicacao_simples: 'Você estacionou em um lugar proibido.',
  exemplo_dia_a_dia: 'Um motorista estaciona em uma vaga de idoso...',
  citacoes: [
    {
      trecho: 'Art. 181. Estacionar o veículo...',
      dispositivo: 'art. 181 XVII do CTB',
      validada: true,
    },
  ],
};

/** The technical view holds the classic card; the sheet is the default tab. */
function verTecnico() {
  fireEvent.click(screen.getByRole('tab', { name: 'Técnico' }));
}

describe('ConsultaResult', () => {
  it('renders the fiscalização sheet by default and keeps the technical view available', () => {
    render(<ConsultaResult card={mockCard} />);

    expect(screen.getByRole('tab', { name: 'Ficha de Fiscalização' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('heading', { name: 'Ficha de Fiscalização' })).toBeInTheDocument();

    verTecnico();
    expect(screen.getByText('Estacionar em local proibido')).toBeInTheDocument();
  });

  it('displays the code MBFT', () => {
    render(<ConsultaResult card={mockCard} />);

    // Header badge + "Código de Enquadramento" row both show it
    expect(screen.getAllByText('516-91').length).toBeGreaterThanOrEqual(1);
  });

  it('displays checklist items on the sheet view', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText(/Fotografar o veículo/)).toBeInTheDocument();
  });

  it('displays error items on the technical view', () => {
    render(<ConsultaResult card={mockCard} />);
    verTecnico();
    expect(screen.getByText(/Sem fotografia da sinalização/)).toBeInTheDocument();
  });

  it('displays gravity level as gravíssima', () => {
    render(<ConsultaResult card={mockCard} />);

    // Header badge + gravidade row
    expect(screen.getAllByText('GRAVÍSSIMA').length).toBeGreaterThanOrEqual(1);
  });

  it('displays points and fine information', () => {
    render(<ConsultaResult card={mockCard} />);

    expect(screen.getByText('7 ponto(s)')).toBeInTheDocument();
    verTecnico();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('has tabs for switching views', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText('Técnico')).toBeInTheDocument();
    expect(screen.getByText('Em Palavras Simples')).toBeInTheDocument();
  });

  it('lists the applicable norms with their source on the technical view', () => {
    render(<ConsultaResult card={mockCard} />);
    verTecnico();

    expect(screen.getByText('Normas aplicáveis')).toBeInTheDocument();
    expect(screen.getByText('art. 181 XVII')).toBeInTheDocument();
  });

  it('says explicitly when no jurisprudence is registered', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText(/Nenhuma decisão cadastrada/)).toBeInTheDocument();
  });

  it('renders registered jurisprudence when present', () => {
    const comDecisao: CartaoEstruturado = {
      ...mockCard,
      jurisprudencia: [
        {
          id: 'j1',
          tipo: 'stj',
          numero: 'REsp 1/SP',
          ementa: 'ementa',
          resumo: 'Resumo da decisão cadastrada',
          data_decisao: '2023-05-10',
          tema: 'estacionamento',
          dispositivos_relacionados: ['art. 181'],
          link_oficial: 'https://exemplo',
          criado_em: '2023-05-10',
        },
      ],
    };

    render(<ConsultaResult card={comDecisao} />);

    expect(screen.getByText('Resumo da decisão cadastrada')).toBeInTheDocument();
    expect(screen.getByText(/STJ · REsp 1\/SP/)).toBeInTheDocument();
  });

  it('shows a friendly empty state when nothing was found', () => {
    const vazio: CartaoEstruturado = {
      ...mockCard,
      sucesso: false,
      enquadramento: null,
      normas: [],
      citacoes: [],
      explicacao_simples: 'Não encontrei essa infração na base.',
    };

    render(<ConsultaResult card={vazio} />);

    expect(screen.getByText('Nada encontrado na base')).toBeInTheDocument();
    // The sheet is still shown, every section in order, with blanks as "—"
    expect(screen.getByRole('heading', { name: 'Ficha de Fiscalização' })).toBeInTheDocument();
    expect(screen.getByText('Tipificação Resumida:')).toBeInTheDocument();
    expect(screen.getByText('Informações Complementares')).toBeInTheDocument();
    expect(screen.getByText(/Não encontrei essa infração/)).toBeInTheDocument();
    expect(screen.queryByText('516-91')).not.toBeInTheDocument();
  });

  it('offers save and share actions for a successful card', () => {
    render(<ConsultaResult card={mockCard} />);

    expect(screen.getByRole('button', { name: /Salvar/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartilhar/ })).toBeInTheDocument();
  });

  it('hides the actions when nothing was found', () => {
    const vazio: CartaoEstruturado = {
      ...mockCard,
      sucesso: false,
      enquadramento: null,
      normas: [],
      citacoes: [],
    };

    render(<ConsultaResult card={vazio} />);

    expect(screen.queryByRole('button', { name: /Salvar/ })).not.toBeInTheDocument();
  });

  it('flags cached answers', () => {
    render(<ConsultaResult card={{ ...mockCard, cache_hit: true }} />);
    expect(screen.getByText(/Resposta do cache/)).toBeInTheDocument();
  });

  it('warns about a possible traffic crime on the technical view', () => {
    render(<ConsultaResult card={{ ...mockCard, crime_transito: true }} />);
    verTecnico();
    expect(screen.getByText(/crime de trânsito/)).toBeInTheDocument();
  });

  it('shows the collected document and the responsible party on the technical view', () => {
    render(<ConsultaResult card={mockCard} />);
    verTecnico();

    expect(screen.getByText(/Recolhimento de documento: CRLV/)).toBeInTheDocument();
    expect(screen.getByText(/Responsável: Proprietário/)).toBeInTheDocument();
  });

  it('lets the agent pick the sheet when several enquadramentos match', () => {
    const ficha = (amparo: string, tipificacao: string) =>
      `${amparo}. Tipificação do Enquadramento: ${tipificacao} Gravidade: Leve\nPenalidade: Multa\nInfrator: Condutor Competência: Municipal. Pontuação: 3`;
    const varias: CartaoEstruturado = {
      ...mockCard,
      enquadramento: null,
      normas: [
        { ...mockCard.normas[0], numero_dispositivo: 'a', texto: ficha('Art. 182, IV', 'Parar em desacordo com as posições.') },
        { ...mockCard.normas[0], numero_dispositivo: 'b', texto: ficha('Art. 182, V', 'Parar na pista de rolamento.') },
      ],
    };

    render(<ConsultaResult card={varias} />);

    const seletor = screen.getByLabelText('Enquadramentos encontrados (2)');
    expect(screen.getByText('Art. 182, IV')).toBeInTheDocument();
    fireEvent.change(seletor, { target: { value: '1' } });
    expect(screen.getByText('Art. 182, V')).toBeInTheDocument();
  });
});
