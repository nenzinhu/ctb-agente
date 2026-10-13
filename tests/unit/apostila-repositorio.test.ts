/** @jest-environment node */
const listarDocumentos = jest.fn();
const obterComHash = jest.fn();

jest.mock('../../lib/ingestion/documents', () => ({
  listDocumentsWithQualityStatus: (...args: unknown[]) => listarDocumentos(...args),
  getDocumentWithHash: (...args: unknown[]) => obterComHash(...args),
}));

const rpc = jest.fn();
const from = jest.fn();
jest.mock('../../lib/db/client', () => ({
  databaseAdminConfigured: true,
  supabaseAdmin: {
    rpc: (...args: unknown[]) => rpc(...args),
    from: (...args: unknown[]) => from(...args),
  },
}));

import {
  carregarTrechosApostila,
  listarDocumentosApostila,
  obterDocumentoApostila,
} from '@/lib/apostila/repositorio';

const base = {
  formato: 'pdf',
  norma_id: null,
  tipo: null,
  caracteres: 1000,
  trechos_sem_vetor: 0,
  fonte_oficial: null,
  versao: null,
  vigente_desde: null,
  conferido_em: null,
  criado_em: '2026-10-01T00:00:00Z',
  atualizado_em: '2026-10-01T00:00:00Z',
};

const documentos = [
  { ...base, id: 'd1', colecao: 'ctb', titulo: 'Código de Trânsito Brasileiro', nome_arquivo: 'ctb.pdf', paginas: 900, trechos: 20, situacao: 'vigente' },
  { ...base, id: 'd2', colecao: 'pop', titulo: 'Manual de POP', nome_arquivo: 'pop.pdf', paginas: 200, trechos: 30, situacao: 'revisar' },
  { ...base, id: 'd3', colecao: 'estrangeiros', titulo: 'Norma antiga', nome_arquivo: 'antiga.pdf', paginas: 10, trechos: 2, situacao: 'substituido' },
  { ...base, id: 'd4', colecao: 'pop', titulo: 'Documento vazio', nome_arquivo: 'vazio.pdf', paginas: 3, trechos: 0, situacao: 'vigente' },
];

function queryCom(resultado: unknown[]) {
  const query: Record<string, jest.Mock | ((resolve: (value: unknown) => void) => void)> = {};
  for (const metodo of ['select', 'eq', 'in', 'not', 'order']) query[metodo] = jest.fn(() => query);
  query.then = (resolve: (value: unknown) => void) => resolve({ data: resultado, error: null });
  return query;
}

describe('repositório de apostilas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listarDocumentos.mockResolvedValue({ documentos, migracaoQualidadePendente: false });
    rpc.mockImplementation((nome: string) => {
      if (nome === 'paginas_documentos_apostila') {
        return Promise.resolve({ data: [{ documento_id: 'd2', pagina_maxima: 198 }], error: null });
      }
      return Promise.resolve({ data: [], error: null });
    });
  });

  it('lista somente documentos elegíveis com conteúdo e página realmente indexada', async () => {
    const resultado = await listarDocumentosApostila();

    expect(resultado).toEqual([
      expect.objectContaining({ id: 'd1', situacao: 'vigente', paginaMaximaDisponivel: null }),
      expect.objectContaining({ id: 'd2', situacao: 'revisar', paginaMaximaDisponivel: 198 }),
    ]);
    expect(resultado.map((item) => item.id)).not.toContain('d3');
    expect(resultado.map((item) => item.id)).not.toContain('d4');
    expect(rpc).not.toHaveBeenCalledWith('search_documentos_apostila', expect.anything());
  });

  it('usa a pesquisa textual unificada e preserva sua relevância', async () => {
    rpc.mockImplementation((nome: string) => Promise.resolve({
      data: nome === 'search_documentos_apostila'
        ? [{ documento_id: 'd2', rank: 100 }, { documento_id: 'd1', rank: 1 }]
        : [{ documento_id: 'd2', pagina_maxima: 198 }],
      error: null,
    }));

    const resultado = await listarDocumentosApostila('manual', 12);

    expect(resultado.map((item) => item.id)).toEqual(['d2', 'd1']);
    expect(rpc).toHaveBeenCalledWith('search_documentos_apostila', { query_text: 'manual', limit_count: 12 });
  });

  it('não envia pontuação isolada à pesquisa textual', async () => {
    await listarDocumentosApostila('... — !!!');

    expect(rpc).not.toHaveBeenCalledWith('search_documentos_apostila', expect.anything());
  });

  it('recarrega hash e situação e recusa documento substituído', async () => {
    obterComHash.mockResolvedValueOnce({ ...documentos[0], hash_conteudo: 'hash-ctb' });
    await expect(obterDocumentoApostila('d1')).resolves.toEqual(expect.objectContaining({ id: 'd1', hashConteudo: 'hash-ctb' }));

    obterComHash.mockResolvedValueOnce({ ...documentos[2], hash_conteudo: 'hash-antigo' });
    await expect(obterDocumentoApostila('d3')).resolves.toBeNull();
  });

  it('lê CTB de dispositivos e outras coleções de documento_trechos em ordem', async () => {
    const linhasCtb = [
      { id: 't2', documento_id: 'd1', numero_dispositivo: 'Art. 2', pagina: 2, ordem: 2, texto: 'Dois' },
      { id: 't1', documento_id: 'd1', numero_dispositivo: 'Art. 1', pagina: 1, ordem: 1, texto: 'Um' },
    ];
    const linhasPop = [{ id: 'p1', documento_id: 'd2', secao: 'Sequência', pagina: 8, ordem: 4, texto: 'Proceder' }];
    from.mockImplementation((tabela: string) => queryCom(tabela === 'dispositivos' ? linhasCtb : linhasPop));

    const ctb = await carregarTrechosApostila({
      id: 'd1', titulo: 'CTB', colecao: 'ctb', paginas: 900, paginaMaximaDisponivel: 2,
      trechos: 2, situacao: 'vigente', hashConteudo: 'h1',
    }, [1, 2]);
    const pop = await carregarTrechosApostila({
      id: 'd2', titulo: 'POP', colecao: 'pop', paginas: 200, paginaMaximaDisponivel: 8,
      trechos: 1, situacao: 'revisar', hashConteudo: 'h2',
    });

    expect(from).toHaveBeenNthCalledWith(1, 'dispositivos');
    expect(ctb.map((trecho) => trecho.texto)).toEqual(['Um', 'Dois']);
    expect(ctb[0].secao).toBe('Art. 1');
    expect(from).toHaveBeenNthCalledWith(2, 'documento_trechos');
    expect(pop[0]).toEqual(expect.objectContaining({ secao: 'Sequência', pagina: 8 }));
  });
});
