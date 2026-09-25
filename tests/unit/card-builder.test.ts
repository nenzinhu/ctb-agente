// Unit tests for the structured response card builder
const jurisprudenciaRows: unknown[] = [];

jest.mock('../../lib/db/client', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.overlaps = () => chain;
  chain.limit = () => chain;
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.single = async () => ({ data: null, error: null });
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: jurisprudenciaRows, error: null }).then(resolve);

  const client = { from: () => chain };
  return { databaseConfigured: true, supabase: client, supabaseAdmin: client };
});

import type { Enquadramento } from '@/lib/db/schema';
import {
  buildCardFromEnquadramento,
  buildCardFromNormas,
  buildCitations,
  buildExplicacaoSimples,
  detectCrimeTransito,
  emptyCard,
  filterValidCitations,
  findNormaForAmparoLegal,
  generateChecklistAIT,
  generateErrosComuns,
  getCategoriaCNH,
} from '@/lib/response/card-builder';
import { formatarMulta, labelDocumento, labelResponsavel } from '@/lib/response/format';

/**
 * Build a complete Enquadramento fixture
 * @param overrides - Fields to override
 * @returns Enquadramento
 */
function enquadramento(overrides: Partial<Enquadramento> = {}): Enquadramento {
  return {
    id: '1',
    codigo_mbft: '516-91',
    desdobramento: 0,
    descricao: 'Estacionar em vaga reservada a idoso sem credencial',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'crlv',
    amparo_legal: 'art. 181 XX do CTB',
    medida_administrativa: 'Remoção do veículo',
    responsavel: 'proprietario',
    criado_em: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('format helpers', () => {
  it('formats a fine stored in cents', () => {
    expect(formatarMulta(29347)).toBe('R$ 293,47');
    expect(formatarMulta(0)).toBe('R$ 0,00');
  });

  it('labels collected documents', () => {
    expect(labelDocumento('cnh')).toBe('CNH');
    expect(labelDocumento('ambos')).toBe('CNH e CRLV');
    expect(labelDocumento(null)).toBeNull();
  });

  it('labels the responsible party', () => {
    expect(labelResponsavel('proprietario')).toBe('Proprietário');
    expect(labelResponsavel(undefined)).toBe('Não informado');
  });
});

describe('AIT checklist', () => {
  it('includes removal and document steps when they apply', () => {
    const checklist = generateChecklistAIT(enquadramento());

    expect(checklist.join(' ')).toContain('CRLV');
    expect(checklist.join(' ')).toContain('remoção');
    expect(checklist.join(' ')).toContain('art. 181 XX do CTB');
  });

  it('omits the steps that do not apply', () => {
    const checklist = generateChecklistAIT(
      enquadramento({
        remove_veiculo: false,
        retem_veiculo: false,
        recolhe_documento: null,
      })
    ).join(' ');

    expect(checklist).not.toContain('CRLV');
    expect(checklist).not.toContain('auto de remoção');
    expect(checklist).not.toContain('retenção');
  });
});

describe('common mistakes', () => {
  it('flags removal and document risks', () => {
    const erros = generateErrosComuns(enquadramento()).join(' ');
    expect(erros).toContain('remoção');
    expect(erros).toContain('recibo');
  });

  it('flags a missing fine value', () => {
    const erros = generateErrosComuns(enquadramento({ valor_multa: 0 })).join(' ');
    expect(erros).toContain('Valor de multa não cadastrado');
  });
});

describe('crime detection', () => {
  it('detects traffic crime articles', () => {
    expect(detectCrimeTransito(enquadramento({ amparo_legal: 'art. 306 do CTB' }))).toBe(true);
    expect(detectCrimeTransito(enquadramento({ amparo_legal: 'art. 165 do CTB' }))).toBe(false);
  });
});

describe('CNH category', () => {
  it('detects motorcycle infractions', () => {
    expect(getCategoriaCNH(enquadramento({ descricao: 'Conduzir motocicleta sem capacete' }))).toBe(
      'A'
    );
  });

  it('defaults to any category', () => {
    expect(getCategoriaCNH(enquadramento())).toBe('qualquer');
  });
});

describe('plain-language summary', () => {
  it('mentions the fine, points and administrative measures', () => {
    const texto = buildExplicacaoSimples(enquadramento());

    expect(texto).toContain('R$ 293,47');
    expect(texto).toContain('7 ponto');
    expect(texto).toContain('remoção do veículo');
    expect(texto).toContain('Resumo gerado automaticamente');
  });
});

describe('citations', () => {
  const normas = [
    {
      numero_dispositivo: 'art. 181 XX',
      texto: 'Estacionar nas vagas reservadas às pessoas com deficiência ou idosos...',
      norma_id: 'ctb',
      tipo: 'lei',
      vigente: true,
    },
  ];

  it('keeps citations that exist in the retrieved norms', () => {
    const citacoes = buildCitations(normas, 'art. 181 XX');
    expect(citacoes).toHaveLength(1);
    expect(citacoes[0].dispositivo).toBe('art. 181 XX');
    expect(citacoes[0].validada).toBe(true);
  });

  it('adds the amparo legal as an unverified citation when the text is missing', () => {
    const citacoes = buildCitations(normas, 'art. 270 do CTB');
    const extra = citacoes.find((c) => c.dispositivo === 'art. 270 do CTB');

    expect(extra).toBeDefined();
    expect(extra?.validada).toBe(false);
  });

  it('drops citations that contradiction the validator', () => {
    const invalidas = [
      { trecho: 'inventado', dispositivo: 'art. 999 do CTB', validada: true },
      { trecho: normas[0].texto, dispositivo: 'art. 181 XX', validada: true },
    ];

    const filtradas = filterValidCitations(invalidas, normas);
    expect(filtradas.map((c) => c.dispositivo)).toEqual(['art. 181 XX']);
  });

  it('finds the norm behind an amparo legal string', () => {
    expect(findNormaForAmparoLegal(normas, 'art. 181 XX do CTB')?.numero_dispositivo).toBe(
      'art. 181 XX'
    );
  });
});

describe('card building', () => {
  it('returns a complete card for an enquadramento', async () => {
    const card = await buildCardFromEnquadramento(enquadramento(), '516-91', [
      {
        numero_dispositivo: 'art. 181 XX',
        texto: 'Estacionar nas vagas reservadas...',
        norma_id: 'ctb',
        tipo: 'lei',
        vigente: true,
      },
    ]);

    expect(card.tipo).toBe('codigo');
    expect(card.sucesso).toBe(true);
    expect(card.consulta).toBe('516-91');
    expect(card.categoria_cnh_exigida).toBe('qualquer');
    expect(card.normas_relacionadas).toEqual(['art. 181 XX']);
    expect(card.citacoes.length).toBeGreaterThan(0);
    expect(card.jurisprudencia).toEqual([]);
  });

  it('builds a card from norms when there is no MBFT code', async () => {
    const card = await buildCardFromNormas(
      [{ numero_dispositivo: 'art. 165', texto: 'Dirigir sob influência de álcool...' }],
      'art. 165',
      'artigo'
    );

    expect(card.tipo).toBe('artigo');
    expect(card.sucesso).toBe(true);
    expect(card.enquadramento).toBeNull();
    expect(card.normas).toHaveLength(1);
    expect(card.explicacao_simples).toContain('art. 165');
  });

  it('marks a failed card when nothing was retrieved', async () => {
    const card = await buildCardFromNormas([], 'consulta qualquer', 'situacao');

    expect(card.sucesso).toBe(false);
    expect(card.normas).toEqual([]);
    expect(card.explicacao_simples).toContain('Não encontrei');
  });

  it('exposes an empty card factory', () => {
    const card = emptyCard('x', 'situacao');
    expect(card.sucesso).toBe(false);
    expect(card.tipo).toBe('situacao');
    expect(card.cache_hit).toBe(false);
  });

  it('carries jurisprudence registered for the theme', async () => {
    jurisprudenciaRows.push({
      id: 'j1',
      tipo: 'stj',
      numero: 'REsp 1/SP',
      ementa: 'ementa',
      resumo: 'resumo',
      data_decisao: '2023-01-01',
      tema: 'estacionamento',
      dispositivos_relacionados: ['art. 181'],
      link_oficial: 'https://exemplo',
      criado_em: '2023-01-01',
    });

    const card = await buildCardFromEnquadramento(enquadramento(), '516-91', [
      {
        numero_dispositivo: 'art. 181 XX',
        texto: 'texto',
        norma_id: 'ctb',
        tipo: 'lei',
        vigente: true,
      },
    ]);

    expect(card.jurisprudencia).toHaveLength(1);
    jurisprudenciaRows.length = 0;
  });
});
