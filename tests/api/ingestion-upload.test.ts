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

jest.mock('../../lib/ingestion/processor', () => ({
  processChunks: (input: { chunks: unknown[] }) => processChunks(input),
}));

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

  it('still removes the temp object when processing throws', async () => {
    processChunks.mockRejectedValueOnce(new Error('boom'));
    const resposta = await POST(requisicao(validBody));
    expect(resposta.status).toBe(500);
    expect(remove).toHaveBeenCalledWith([validBody.storagePath]);
  });
});
