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

let dbConfigurado = true;
const createSignedUploadUrl = jest.fn(async (path: string) => ({
  data: { path, token: 'signed-token-abc', signedUrl: `https://x.supabase.co/storage/v1/${path}` },
  error: null,
}));

jest.mock('../../lib/db/client', () => ({
  get databaseConfigured() {
    return dbConfigurado;
  },
  supabase: {},
  supabaseAdmin: {
    storage: {
      from: () => ({
        createSignedUploadUrl: (path: string) => createSignedUploadUrl(path),
      }),
    },
  },
}));

import { NextRequest } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { POST } from '@/app/api/admin/documents/upload-url/route';

function requisicao(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/admin/documents/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/documents/upload-url', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    cookieStore.clear();
    dbConfigurado = true;
    await createSession('nenzinhu');
  });

  it('rejects without a session', async () => {
    cookieStore.clear();
    const resposta = await POST(requisicao({ fileName: 'ctb.pdf', contentType: 'application/pdf' }));
    expect(resposta.status).toBe(401);
  });

  it('rejects a disallowed content type', async () => {
    const resposta = await POST(requisicao({ fileName: 'ctb.exe', contentType: 'application/x-msdownload' }));
    expect(resposta.status).toBe(400);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('mints a signed upload URL for an allowed file', async () => {
    const resposta = await POST(requisicao({ fileName: 'CTB completo (2026).pdf', contentType: 'application/pdf' }));
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(corpo.bucket).toBe('documentos-pendentes');
    expect(corpo.token).toBe('signed-token-abc');
    // The stored path must not carry the original spaces/parentheses through unsanitized.
    expect(corpo.path).not.toMatch(/[()\s]/);
    expect(createSignedUploadUrl).toHaveBeenCalledTimes(1);
  });

  it('answers 503 when Supabase is not configured', async () => {
    dbConfigurado = false;
    const resposta = await POST(requisicao({ fileName: 'ctb.pdf', contentType: 'application/pdf' }));
    expect(resposta.status).toBe(503);
    expect(createSignedUploadUrl).not.toHaveBeenCalled();
  });
});
