/**
 * @jest-environment node
 */
const cookieStore = new Map<string, string>();

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
}));

const FILE_TEXT = 'Art. 165 do CTB — dirigir sob influência de álcool. '.repeat(20);

const download = jest.fn(async (_path: string) => ({
  data: new Blob([FILE_TEXT], { type: 'text/plain' }) as Blob | null,
  error: null as { message: string } | null,
}));
const remove = jest.fn(async (_paths: string[]) => ({ data: null, error: null }));

jest.mock('../../lib/db/client', () => ({
  databaseConfigured: true,
  supabase: {},
  supabaseAdmin: {
    storage: {
      from: () => ({
        download: (path: string) => download(path),
        remove: (paths: string[]) => remove(paths),
      }),
    },
  },
}));

const processChunks = jest.fn(async (input: { chunks: unknown[] }) => ({
  insertedCount: input.chunks.length,
  failedCount: 0,
  errors: [],
  insertedIds: input.chunks.map((_c, i) => `id-${i}`),
}));

const processTrechos = jest.fn(async (input: { chunks: unknown[] }) => ({
  insertedCount: input.chunks.length,
  failedCount: 0,
  semVetor: 0,
  errors: [],
  insertedIds: input.chunks.map((_c, i) => `t-${i}`),
}));

jest.mock('../../lib/ingestion/processor', () => ({
  processChunks: (input: { chunks: unknown[] }) => processChunks(input),
  processTrechos: (input: { chunks: unknown[] }) => processTrechos(input),
}));

const documento = { id: 'doc-1', colecao: 'ctb', titulo: 'ctb', nome_arquivo: 'ctb.txt', norma_id: 'ctb' };
const findDocumentByHash = jest.fn(async (): Promise<unknown> => null);
const createDocument = jest.fn(async (novo: { colecao: string }): Promise<unknown> => ({ ...documento, colecao: novo.colecao }));
const deleteDocument = jest.fn(async () => true);
const finalizeDocument = jest.fn(async () => undefined);
const replacePreviousVersions = jest.fn(async () => 1);

jest.mock('../../lib/ingestion/documents', () => {
  const real = jest.requireActual('../../lib/ingestion/documents');
  return {
    ...real,
    findDocumentByHash: () => findDocumentByHash(),
    createDocument: (novo: { colecao: string }) => createDocument(novo),
    deleteDocument: () => deleteDocument(),
    finalizeDocument: () => finalizeDocument(),
    replacePreviousVersions: () => replacePreviousVersions(),
  };
});

import { NextRequest } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { POST } from '@/app/api/ingestion/upload/route';

function requisicao(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/ingestion/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  storagePath: '123-abc-ctb.txt',
  fileName: 'ctb.txt',
  normaId: 'ctb',
  documentType: 'lei' as const,
  fonteOficial: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
  versao: 'Lei nº 9.503/1997 — compilada',
  vigenteDesde: '2024-01-01',
  conferidoEm: '2026-09-01',
};

describe('POST /api/ingestion/upload', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    cookieStore.clear();
    download.mockResolvedValue({ data: new Blob([FILE_TEXT], { type: 'text/plain' }), error: null });
    await createSession('nenzinhu');
  });

  it('rejects without a session', async () => {
    cookieStore.clear();
    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(401);
    expect(download).not.toHaveBeenCalled();
  });

  it('rejects a payload missing normaId', async () => {
    const resposta = await POST(requisicao({ ...validBody, normaId: undefined }));
    expect(resposta.status).toBe(400);
    expect(download).not.toHaveBeenCalled();
  });

  it('exige os quatro metadados oficiais antes de baixar CTB ou POP', async () => {
    const ctb = await POST(requisicao({ ...validBody, fonteOficial: undefined }));
    const pop = await POST(requisicao({
      storagePath: '1-pop.txt',
      fileName: 'pop.txt',
      colecao: 'pop',
      titulo: 'POP 1.01',
    }));

    expect(ctb.status).toBe(400);
    expect(pop.status).toBe(400);
    expect(download).not.toHaveBeenCalled();
  });

  it('downloads from Storage, processes the chunks, and removes the temp object', async () => {
    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(corpo.success).toBe(true);
    expect(corpo.data.insertedCount).toBeGreaterThan(0);
    expect(processChunks).toHaveBeenCalledWith(
      expect.objectContaining({ normaId: 'ctb', documentType: 'lei' })
    );
    expect(remove).toHaveBeenCalledWith([validBody.storagePath]);
  });

  it('returns 404 when the storage object is missing', async () => {
    download.mockResolvedValue({ data: null, error: { message: 'not found' } });
    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(404);
    expect(processChunks).not.toHaveBeenCalled();
  });

  it('registers the document, then replaces the previous version of the same file', async () => {
    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(createDocument).toHaveBeenCalledWith(expect.objectContaining({
      colecao: 'ctb',
      normaId: 'ctb',
      formato: 'txt',
      fonteOficial: validBody.fonteOficial,
      versao: validBody.versao,
      vigenteDesde: validBody.vigenteDesde,
      conferidoEm: validBody.conferidoEm,
      situacao: 'vigente',
    }));
    expect(processChunks).toHaveBeenCalledWith(expect.objectContaining({ documentoId: 'doc-1' }));
    expect(finalizeDocument).toHaveBeenCalled();
    expect(corpo.data).toMatchObject({ documentoId: 'doc-1', substituidos: 1, legado: false });
  });

  it('does not index the same content twice', async () => {
    findDocumentByHash.mockResolvedValueOnce({ ...documento, trechos: 12 });

    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).duplicado).toBe(true);
    expect(processChunks).not.toHaveBeenCalled();
  });

  it('still indexes a CTB document when migration 008 is missing', async () => {
    const { MigrationPendingError } = jest.requireActual('../../lib/ingestion/documents');
    findDocumentByHash.mockRejectedValueOnce(new MigrationPendingError());

    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(200);
    expect((await resposta.json()).data.legado).toBe(true);
    expect(processChunks).toHaveBeenCalledWith(expect.objectContaining({ documentoId: undefined }));
  });

  it('indexes a POP into the document base, cut by sections', async () => {
    const resposta = await POST(
      requisicao({ ...validBody, storagePath: '1-pop.txt', fileName: 'pop.txt', colecao: 'pop', titulo: 'POP 1.01' })
    );
    expect(resposta.status).toBe(200);
    expect(processTrechos).toHaveBeenCalledWith(expect.objectContaining({ documentoId: 'doc-1', titulo: 'POP 1.01' }));
    expect(processChunks).not.toHaveBeenCalled();
  });

  it('asks for migration 008 before accepting a POP', async () => {
    const { MigrationPendingError } = jest.requireActual('../../lib/ingestion/documents');
    findDocumentByHash.mockRejectedValueOnce(new MigrationPendingError());

    const resposta = await POST(requisicao({ ...validBody, storagePath: '1-pop.txt', fileName: 'pop.txt', colecao: 'pop' }));
    expect(resposta.status).toBe(503);
    expect((await resposta.json()).message).toMatch(/migrations-008/);
  });

  it('orienta aplicar a migration 011 quando os metadados não podem ser persistidos', async () => {
    const { QualityMigrationPendingError } = jest.requireActual('../../lib/ingestion/documents');
    createDocument.mockRejectedValueOnce(new QualityMigrationPendingError());

    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(503);
    expect((await resposta.json()).message).toMatch(/migrations-011-document-quality\.sql/);
  });

  it('removes the document row when no excerpt could be saved', async () => {
    processChunks.mockResolvedValueOnce({
      insertedCount: 0,
      failedCount: 3,
      errors: [{ chunkIndex: 0, error: 'Database insert failed: boom' }],
      insertedIds: [],
    } as never);

    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(422);
    expect(deleteDocument).toHaveBeenCalled();
  });

  it('still removes the temp object when processing throws', async () => {
    processChunks.mockRejectedValueOnce(new Error('boom'));
    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(500);
    expect(remove).toHaveBeenCalledWith([validBody.storagePath]);
  });
});
