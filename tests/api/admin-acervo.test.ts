/**
 * @jest-environment node
 */
const mockIndexarDocumento = jest.fn(async (_entrada: unknown) => ({
  status: 'duplicado' as const,
  documento: { id: 'doc-882' },
}));
const mockFindDocumentByHash = jest.fn(async (_colecao: unknown, _hash: unknown) => null as unknown);

jest.mock('../../lib/auth/session', () => ({
  validateSession: jest.fn(async () => true),
}));

jest.mock('../../lib/db/client', () => ({
  databaseConfigured: true,
  supabaseAdmin: {},
}));

jest.mock('../../lib/ingestion/indexar', () => ({
  indexarDocumento: (entrada: unknown) => mockIndexarDocumento(entrada),
}));

jest.mock('../../lib/ingestion/documents', () => {
  const real = jest.requireActual('../../lib/ingestion/documents');
  return {
    ...real,
    findDocumentByHash: (colecao: unknown, hash: unknown) => mockFindDocumentByHash(colecao, hash),
  };
});

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/admin/acervo/route';

describe('POST /api/admin/acervo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('encaminha fonte, vigência e situação oficiais da Resolução 882', async () => {
    const request = new NextRequest('http://localhost/api/admin/acervo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'resolucao-contran-882-2021' }),
    });

    const resposta = await POST(request);

    expect(resposta.status).toBe(200);
    expect(mockIndexarDocumento).toHaveBeenCalledWith(expect.objectContaining({
      colecao: 'ctb',
      normaId: 'contran-res-882-2021',
      documentType: 'resolucao',
      dataPublicacao: '2021-12-24T00:00:00.000Z',
      dataVigenciaInicio: '2022-01-03T00:00:00.000Z',
      fonteOficial:
        'https://www.in.gov.br/en/web/dou/-/resolucao-contran-n-882-de-13-de-dezembro-de-2021-370017699',
      versao: 'Publicada no DOU em 24/12/2021',
      vigenteDesde: '2022-01-03',
      conferidoEm: '2026-10-10',
      situacao: 'vigente',
    }));
  });
});

describe('GET /api/admin/acervo', () => {
  beforeEach(() => jest.clearAllMocks());

  it('oferece atualização quando a Lista de Fatos tem metadados antigos', async () => {
    mockFindDocumentByHash
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'fatos-antigo',
        trechos: 510,
        fonte_oficial: null,
        versao: null,
        vigente_desde: null,
        conferido_em: null,
        situacao: 'revisar',
      })
      .mockResolvedValueOnce(null);

    const resposta = await GET();
    const corpo = await resposta.json();
    const fatos = corpo.itens.find((item: { id: string }) => item.id === 'fatos-pmsc-mobile');

    expect(fatos).toMatchObject({ indexado: false, precisaAtualizar: true });
  });

  it('oferece reindexação quando o registro não tem trechos', async () => {
    mockFindDocumentByHash
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'resolucao-incompleta',
        trechos: 0,
        fonte_oficial:
          'https://www.in.gov.br/en/web/dou/-/resolucao-contran-n-882-de-13-de-dezembro-de-2021-370017699',
        versao: 'Publicada no DOU em 24/12/2021',
        vigente_desde: '2022-01-03',
        conferido_em: '2026-10-10',
        situacao: 'vigente',
      });

    const resposta = await GET();
    const corpo = await resposta.json();
    const resolucao = corpo.itens.find((item: { id: string }) => item.id === 'resolucao-contran-882-2021');

    expect(resolucao).toMatchObject({ indexado: false, precisaAtualizar: true });
  });
});
