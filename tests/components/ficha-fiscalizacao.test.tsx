import { render, screen } from '@testing-library/react';
import FichaFiscalizacao from '@/components/FichaFiscalizacao';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { parseMbftFields } from '@/lib/response/mbft-fields';

const TEXTO_MBFT_181_XX = `Art. 181, XX. Tipificação do Enquadramento: Estacionar o veículo nas vagas reservadas às pessoas com deficiência ou idosos, sem credencial que comprove tal condição. Gravidade: Gravíssima
Penalidade: Multa
Medida Administrativa: Remoção do veículo (Vide Parte Geral deste Manual).
Pode Configurar Crime de Trânsito:
NÃOInfrator: Condutor Competência: Órgão ou Entidade de Trânsito Municipal e Rodoviário. Pontuação: 7 Constatação da Infração: Possível sem abordagem.
Quando Autuar: Quando NÃO Autuar: Definições e Procedimentos: Exemplos do Campo de Observações do AIT:
1. Veículo estacionado em vaga sinalizada como de uso exclusivo de idoso (pessoa com idade igual ou maior de 60 anos): 1.1 sem credencial 1.2 com credencial vencida.
2. Veículo estacionado em vaga sinalizada como de uso exclusivo de pessoa com deficiência sem o cartão especial: 2.1 sem credencial 2.2 com credencial vencida.`;

const mockCard: CartaoEstruturado = {
  tipo: 'codigo',
  sucesso: true,
  consulta: '516-91',
  normas: [
    {
      numero_dispositivo: 'art. 181 XX',
      texto: TEXTO_MBFT_181_XX,
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
    descricao: 'Estacionar em vaga reservada a idoso ou pessoa com deficiência sem credencial',
    amparo_legal: 'art. 181 XX do CTB',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF 2026',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: null,
    medida_administrativa: 'Remoção do veículo',
    responsavel: 'proprietario',
    criado_em: new Date().toISOString(),
  },
  checklist_ait: [],
  erros_comuns: [],
  concurso_infracoes: [],
  crime_transito: false,
  categoria_cnh_exigida: 'qualquer',
  normas_relacionadas: ['art. 181 XX'],
  jurisprudencia: [],
  explicacao_simples: '',
  exemplo_dia_a_dia: '',
  citacoes: [],
};

const campos = parseMbftFields(TEXTO_MBFT_181_XX);

describe('FichaFiscalizacao', () => {
  it('renderiza o título e as seções da ficha', () => {
    render(<FichaFiscalizacao card={mockCard} campos={campos} />);

    expect(screen.getByText('Ficha de Fiscalização')).toBeInTheDocument();
    expect(screen.getByText('Identificação da Infração')).toBeInTheDocument();
    expect(screen.getByText('Classificação e Penalidades')).toBeInTheDocument();
    expect(screen.getByText('Critérios de Autuação')).toBeInTheDocument();
    expect(screen.getByText('Definições e Procedimentos')).toBeInTheDocument();
    expect(screen.getByText('Exemplos do Campo de Observações do AIT')).toBeInTheDocument();
    expect(screen.getByText('Informações Complementares')).toBeInTheDocument();
  });

  it('exibe os rótulos da identificação', () => {
    render(<FichaFiscalizacao card={mockCard} campos={campos} />);

    expect(screen.getByText('Tipificação Resumida:')).toBeInTheDocument();
    expect(screen.getByText('Código de Enquadramento:')).toBeInTheDocument();
    expect(screen.getByText('Amparo Legal:')).toBeInTheDocument();
    expect(screen.getByText('Tipificação do Enquadramento:')).toBeInTheDocument();
    expect(screen.getByText('Infrator:')).toBeInTheDocument();
    expect(screen.getByText('Competência:')).toBeInTheDocument();
    expect(screen.getByText('Constatação da Infração:')).toBeInTheDocument();
  });

  it('preenche a tipificação resumida com a descrição do enquadramento', () => {
    render(<FichaFiscalizacao card={mockCard} campos={campos} />);

    expect(screen.getByText(/Estacionar em vaga reservada a idoso/)).toBeInTheDocument();
  });

  it('exibe a competência extraída do chunk do MBFT', () => {
    render(<FichaFiscalizacao card={mockCard} campos={campos} />);

    expect(screen.getByText('Órgão ou Entidade de Trânsito Municipal e Rodoviário.')).toBeInTheDocument();
  });

  it('exibe a pontuação vinda do banco', () => {
    render(<FichaFiscalizacao card={mockCard} campos={campos} />);

    expect(screen.getByText('7 ponto(s)')).toBeInTheDocument();
  });

  it('renderiza os exemplos do campo de observações', () => {
    render(<FichaFiscalizacao card={mockCard} campos={campos} />);

    expect(screen.getByText(/Veículo estacionado em vaga sinalizada como de uso exclusivo de idoso/)).toBeInTheDocument();
    expect(screen.getByText(/Veículo estacionado em vaga sinalizada como de uso exclusivo de pessoa com deficiência/)).toBeInTheDocument();
  });

  it('usa o fallback do banco para o crime de trânsito quando o chunk não traz o rótulo', () => {
    render(
      <FichaFiscalizacao
        card={{ ...mockCard, crime_transito: true, normas: [] }}
        campos={null}
      />
    );

    expect(screen.getByText(/SIM \(detectado nos dispositivos citados\)/)).toBeInTheDocument();
  });

  it('mostra travessão quando não há dados para o campo', () => {
    render(<FichaFiscalizacao card={{ ...mockCard, normas: [] }} campos={null} />);

    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('mostra a mensagem de vazio para exemplos inexistentes', () => {
    render(<FichaFiscalizacao card={{ ...mockCard, normas: [] }} campos={null} />);

    expect(screen.getByText('Nenhum exemplo cadastrado para este enquadramento.')).toBeInTheDocument();
  });
});
