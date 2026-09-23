import { Enquadramento } from '@/lib/db/schema';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { formatarCartaoParaTexto, linkDoCartao } from '@/lib/response/share';

function enquadramento(overrides: Partial<Enquadramento> = {}): Enquadramento {
  return {
    id: '1',
    codigo_mbft: '516-91',
    desdobramento: 0,
    descricao: 'Estacionar em local proibido',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF 2026',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'crlv',
    amparo_legal: 'art. 181, inciso XVII do CTB',
    medida_administrativa: 'Remoção obrigatória',
    responsavel: 'proprietario',
    criado_em: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function card(overrides: Partial<CartaoEstruturado> = {}): CartaoEstruturado {
  return {
    tipo: 'codigo',
    sucesso: true,
    consulta: '516-91',
    enquadramento: enquadramento(),
    normas: [],
    checklist_ait: ['[ ] Fotografar o veículo'],
    erros_comuns: [],
    concurso_infracoes: [],
    crime_transito: false,
    categoria_cnh_exigida: 'qualquer',
    normas_relacionadas: [],
    jurisprudencia: [],
    explicacao_simples: 'Você estacionou em um lugar proibido.',
    exemplo_dia_a_dia: 'Um motorista estaciona em uma vaga de idoso.',
    citacoes: [],
    cache_hit: false,
    tempo_ms: 42,
    ...overrides,
  };
}

describe('formatarCartaoParaTexto', () => {
  it('summarizes the enquadramento', () => {
    const texto = formatarCartaoParaTexto(card());

    expect(texto).toContain('Estacionar em local proibido');
    expect(texto).toContain('Código MBFT: 516-91');
    expect(texto).toContain('GRAVÍSSIMA');
    expect(texto).toContain('7 pontos');
    expect(texto).toContain('R$ 293,47');
    expect(texto).toContain('art. 181, inciso XVII do CTB');
  });

  it('lists the administrative measures', () => {
    const texto = formatarCartaoParaTexto(card());

    expect(texto).toContain('Recolhe documento: CRLV');
    expect(texto).toContain('Remoção do veículo');
  });

  it('flags a possible traffic crime', () => {
    expect(formatarCartaoParaTexto(card({ crime_transito: true }))).toContain(
      'crime de trânsito'
    );
  });

  it('includes the AIT checklist and the simple explanation', () => {
    const texto = formatarCartaoParaTexto(card());

    expect(texto).toContain('Checklist do AIT:');
    expect(texto).toContain('• [ ] Fotografar o veículo');
    expect(texto).toContain('Você estacionou em um lugar proibido.');
  });

  it('appends the link when one is given', () => {
    const texto = formatarCartaoParaTexto(card(), 'https://ctb.example/consulta?q=516-91');

    expect(texto).toContain('https://ctb.example/consulta?q=516-91');
  });

  it('describes an empty result instead of a card', () => {
    const texto = formatarCartaoParaTexto(
      card({
        sucesso: false,
        enquadramento: null,
        consulta: 'situação desconhecida',
        explicacao_simples: 'Não encontrei essa infração na base.',
      })
    );

    expect(texto).toContain('nada encontrado na base');
    expect(texto).toContain('Não encontrei essa infração na base.');
    expect(texto).not.toContain('Código MBFT');
  });

  it('adds the desdobramento only when there is one', () => {
    expect(formatarCartaoParaTexto(card())).not.toContain('Desdobramento');
    expect(
      formatarCartaoParaTexto(card({ enquadramento: enquadramento({ desdobramento: 1 }) }))
    ).toContain('Desdobramento: 1');
  });
});

describe('linkDoCartao', () => {
  it('builds an encoded consultation URL', () => {
    const link = linkDoCartao(card({ consulta: 'art. 165 § 1º' }), 'https://ctb.example');

    expect(link).toBe('https://ctb.example/consulta?q=art.%20165%20%C2%A7%201%C2%BA');
  });

  it('tolerates a trailing slash in the origin', () => {
    expect(linkDoCartao(card(), 'http://localhost:3000/')).toBe(
      'http://localhost:3000/consulta?q=516-91'
    );
  });
});
