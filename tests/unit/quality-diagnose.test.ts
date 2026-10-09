/** @jest-environment node */

const obterEstatisticasDocumentais = jest.fn(async (colecao: string) => ({
  documentos: colecao === 'mbft' ? 0 : 1,
  trechos: colecao === 'mbft' ? 0 : 100,
  trechosSemVetor: 0,
  vazios: 0,
  curtos: 0,
  duplicados: 0,
}));
const salvarDiagnostico = jest.fn(async (diagnostico: unknown, _duracao: number) => ({ ...(diagnostico as object), id: 'diag-1' }));
const executarCasos = jest.fn(async (_casos: unknown, _buscar: unknown) => ({
  total: 4,
  hit1: 100,
  hit3: 100,
  tempoMedioMs: 30,
  piorTempoMs: 50,
  casos: [],
}));

jest.mock('../../lib/quality/repository', () => ({
  obterEstatisticasDocumentais: (colecao: string) => obterEstatisticasDocumentais(colecao),
  salvarDiagnostico: (diagnostico: unknown, duracao: number) => salvarDiagnostico(diagnostico, duracao),
}));
jest.mock('../../lib/quality/manifest', () => ({
  carregarFontesLocais: () => ['ctb', 'mbft', 'pop'].map((colecao) => ({
    colecao,
    arquivo: `${colecao}.json`,
    fonteOficial: 'Fonte oficial',
    versao: '2026',
    vigenteDesde: '2024-01-01',
    conferidoEm: '2026-09-01',
    situacao: 'vigente',
  })),
}));
jest.mock('../../lib/quality/cases', () => ({
  carregarCasosBusca: () => ['ctb', 'mbft', 'pop'].map((colecao) => ({
    id: `caso-${colecao}`,
    colecao,
    consulta: 'teste',
    categoria: 'frase',
    esperados: ['x'],
    comparacao: 'exata',
    maxPosicao: 3,
  })),
}));
jest.mock('../../lib/quality/benchmark', () => ({ executarCasos: (casos: unknown, buscar: unknown) => executarCasos(casos, buscar) }));
jest.mock('../../lib/quality/search-adapters', () => ({ buscarParaDiagnostico: jest.fn() }));
jest.mock('../../lib/ingestion/documents', () => ({
  listDocuments: async (colecao: string) => colecao === 'ctb' ? [{
    fonte_oficial: 'Fonte enviada', versao: '2026', vigente_desde: '2024-01-01', conferido_em: '2026-09-01', situacao: 'vigente',
  }] : [],
}));
jest.mock('../../lib/mbft/fichas', () => ({
  todasAsFichas: () => [{ codigo: '516-91', tipificacaoResumida: 'Infração de teste', tipificacao: 'Texto oficial suficiente para análise.' }],
}));
jest.mock('../../lib/pop/pops', () => ({
  todosOsPops: () => [{ numero: '002', titulo: 'Revista pessoal', sequencia: [{ texto: 'Procedimento oficial suficiente.' }] }],
}));

import { executarDiagnostico } from '@/lib/quality/diagnose';

describe('orquestração do diagnóstico', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MISTRAL_API_KEY = 'teste';
    obterEstatisticasDocumentais.mockImplementation(async (colecao: string) => ({
      documentos: colecao === 'mbft' ? 0 : 1,
      trechos: colecao === 'mbft' ? 0 : 100,
      trechosSemVetor: 0,
      vazios: 0,
      curtos: 0,
      duplicados: 0,
    }));
    executarCasos.mockResolvedValue({ total: 4, hit1: 100, hit3: 100, tempoMedioMs: 30, piorTempoMs: 50, casos: [] });
  });

  afterAll(() => delete process.env.MISTRAL_API_KEY);

  it.each(['ctb', 'mbft', 'pop'] as const)('agrega e persiste a coleção %s', async (colecao) => {
    const resultado = await executarDiagnostico(colecao);
    expect(resultado.colecao).toBe(colecao);
    expect(resultado.id).toBe('diag-1');
    expect(salvarDiagnostico).toHaveBeenCalledWith(expect.objectContaining({ colecao }), expect.any(Number));
    expect(executarCasos).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ colecao })]), expect.any(Function));
  });

  it('aplica vetores somente onde fazem parte da recuperação', async () => {
    const mbft = await executarDiagnostico('mbft');
    const ctb = await executarDiagnostico('ctb');
    expect(mbft.detalhes.vetoresAplicaveis).toBe(false);
    expect(ctb.detalhes.vetoresAplicaveis).toBe(true);
  });

  it('registra uma verificação que falhou sem rejeitar todo o diagnóstico', async () => {
    obterEstatisticasDocumentais.mockRejectedValueOnce(new Error('RPC indisponível'));
    const resultado = await executarDiagnostico('ctb');
    expect(resultado.status).toBe('critica');
    expect(resultado.detalhes.motivos.join(' ')).toMatch(/estatísticas.*indisponíveis/i);
    expect(salvarDiagnostico).toHaveBeenCalled();
  });
});
