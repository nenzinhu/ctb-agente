/** @jest-environment node */
import { NextRequest } from 'next/server';
import { embeddingModel, NEMOTRON_EMBED_MODEL } from '@/lib/ai/embedding-models';

let mockAuthorized = true;
let mockConfigured = true;
const mockSetModel = jest.fn(async (_id: string) => undefined);
const mockEmbed = jest.fn(async (..._args: unknown[]) => Array(1024).fill(0.01));
jest.mock('../../lib/auth/session', () => ({ validateSession: async () => mockAuthorized }));
jest.mock('../../lib/ai/embedding-config', () => ({
  getEmbeddingConfig: async () => ({ ...embeddingModel(NEMOTRON_EMBED_MODEL), configurado: mockConfigured }),
  setEmbeddingModel: (id: string) => mockSetModel(id),
}));
jest.mock('../../lib/ai/embeddings', () => ({ embeddingChain: { embed: (...args: unknown[]) => mockEmbed(...args) } }));
jest.mock('../../lib/db/client', () => ({ databaseAdminConfigured: true,
  supabaseAdmin: { rpc: async () => ({ data: 1, error: null }) },
}));

import { GET, POST, PUT } from '@/app/api/admin/embeddings/route';
const request = (method: string, body: unknown) => new NextRequest('http://localhost/api/admin/embeddings', {
  method, body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' },
});

describe('modelo vetorial administrativo', () => {
  beforeEach(() => { jest.clearAllMocks(); mockAuthorized = true; mockConfigured = true; });
  it('exige sessão para ler, trocar e testar o modelo', async () => {
    mockAuthorized = false;
    expect((await GET()).status).toBe(401);
    expect((await PUT(request('PUT', { modelo: NEMOTRON_EMBED_MODEL }))).status).toBe(401);
    expect((await POST(request('POST', { modelo: NEMOTRON_EMBED_MODEL }))).status).toBe(401);
    expect(mockSetModel).not.toHaveBeenCalled();
    expect(mockEmbed).not.toHaveBeenCalled();
  });
  it('apresenta Nemotron como principal sem retornar chaves', async () => {
    process.env.OPENROUTER_API_KEY = 'private-test-secret';
    try {
      const payload = await (await GET()).json();
      expect(payload.modelo).toBe(NEMOTRON_EMBED_MODEL);
      expect(payload.modelos[0]).toMatchObject({ id: NEMOTRON_EMBED_MODEL, principal: true });
      expect(JSON.stringify(payload)).not.toContain('private-test-secret');
    } finally { delete process.env.OPENROUTER_API_KEY; }
  });
  it('salva apenas modelos do catálogo vetorial', async () => {
    expect((await PUT(request('PUT', { modelo: 'openai/modelo-inexistente' }))).status).toBe(400);
    expect(mockSetModel).not.toHaveBeenCalled();
    expect((await PUT(request('PUT', { modelo: NEMOTRON_EMBED_MODEL }))).status).toBe(200);
    expect(mockSetModel).toHaveBeenCalledWith(NEMOTRON_EMBED_MODEL);
  });
  it('testa o modelo com texto sintético e não retorna os vetores', async () => {
    const response = await POST(request('POST', { modelo: NEMOTRON_EMBED_MODEL }));
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ ok: true, dimensoes: 1024, modelo: NEMOTRON_EMBED_MODEL });
    expect(payload).not.toHaveProperty('embedding');
    expect(mockEmbed).toHaveBeenCalledWith(expect.any(String), NEMOTRON_EMBED_MODEL);
  });
});
