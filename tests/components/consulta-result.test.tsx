import { render, screen } from '@testing-library/react';
import ConsultaResult from '@/components/ConsultaResult';
import { CartaoEstruturado } from '@/lib/response/response-types';

const mockCard: CartaoEstruturado = {
  tipo: 'enquadramento',
  sucesso: true,
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
  concurso_infrações: [],
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

describe('ConsultaResult', () => {
  it('renders technical view by default', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText('516-91')).toBeInTheDocument();
    expect(screen.getByText('Estacionar em local proibido')).toBeInTheDocument();
  });

  it('displays the code MBFT', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText('516-91')).toBeInTheDocument();
  });

  it('displays checklist items', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText(/Fotografar o veículo/)).toBeInTheDocument();
  });

  it('displays error items', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText(/Sem fotografia da sinalização/)).toBeInTheDocument();
  });

  it('displays gravity level as gravíssima', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText('GRAVÍSSIMA')).toBeInTheDocument();
  });

  it('displays points and fine information', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('has tabs for switching views', () => {
    render(<ConsultaResult card={mockCard} />);
    expect(screen.getByText('Técnico')).toBeInTheDocument();
    expect(screen.getByText('Em Palavras Simples')).toBeInTheDocument();
  });
});
