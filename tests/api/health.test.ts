/**
 * @jest-environment node
 */
// Tests for GET /api/health
const respostas: Record<string, { error: unknown; count?: number }> = {};
const rpcRespostas: Record<string, { error: unknown; data?: unknown }> = {};
let dbConfigurado = true;
let dbAdminConfigurado = true;

jest.mock('../../lib/db/client', () => ({
  get databaseConfigured() {
    return dbConfigurado;
  },
  get databaseAdminConfigured() {
    return dbAdminConfigurado;
  },
  supabase: {
    from: (tabela: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.limit = () => chain;
      chain.eq = () => chain;
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(respostas[tabela] ?? { error: null, count: 5 }).then(resolve);
      return chain;
    },
    rpc: (fn: string) => {
      const chain: Record<string, unknown> = {};
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(rpcRespostas[fn] ?? { error: null, data: fn === 'rag_schema_version' ? 10 : [] }).then(resolve);
      return chain;
    },
  },
  supabaseAdmin: {
    from: (tabela: string) => {
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.limit = () => chain;
      chain.eq = () => chain;
      chain.maybeSingle = () => Promise.resolve(respostas[tabela] ?? { error: null, data: null });
      chain.then = (resolve: (value: unknown) => unknown) =>
        Promise.resolve(respostas[tabela] ?? { error: null, count: 5 }).then(resolve);
      return chain;
    },
  },
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    dbConfigurado = true;
    dbAdminConfigurado = true;
    for (const chave of Object.keys(respostas)) delete respostas[chave];
    for (const chave of Object.keys(rpcRespostas)) delete rpcRespostas[chave];
  });

  it('reports ok when the database answers', async () => {
    const resposta = await GET();
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(corpo.status).toBe('ok');
    expect(corpo.banco).toBe('ok');
    expect(corpo.bancoEscrita).toBe('ok');
    expect(corpo.esquemaRag).toBe(10);
    expect(corpo).toHaveProperty('versao');
    expect(Array.isArray(corpo.provedoresAusentes)).toBe(true);
    expect(corpo.configuracoes).toMatchObject({ consultas_por_hora: expect.any(Number) });
  });

  it('warns when migration 010 or the service role is missing', async () => {
    dbAdminConfigurado = false;
    rpcRespostas.rag_schema_version = { error: { code: 'PGRST202' } };
    const resposta = await GET();
    const corpo = await resposta.json();
    expect(resposta.status).toBe(503);
    expect(corpo.status).toBe('degraded');
    expect(corpo.bancoEscrita).toBe('indisponivel');
    expect(corpo.avisos.join(' ')).toMatch(/migrations-010/);
    expect(corpo.avisos.join(' ')).toMatch(/SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('exposes the embeddings status and warnings array', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    try {
      const corpo = await (await GET()).json();
      expect(corpo.embeddings).toBe('ok');
      expect(Array.isArray(corpo.avisos)).toBe(true);
    } finally {
      delete process.env.MISTRAL_API_KEY;
    }
  });

  it('warns when the embedding key is absent (hybrid search runs BM25 only)', async () => {
    delete process.env.MISTRAL_API_KEY;

    const corpo = await (await GET()).json();
    expect(corpo.embeddings).toBe('indisponivel');
    expect(corpo.avisos.join(' ')).toMatch(/MISTRAL_API_KEY/);
  });

  it('warns when the vector-search RPC is missing (migration 003 pending)', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    rpcRespostas.search_dispositivos_vector = { error: { code: 'PGRST202' } };
    try {
      const corpo = await (await GET()).json();
      expect(corpo.avisos.join(' ')).toMatch(/migrations-003/);
    } finally {
      delete process.env.MISTRAL_API_KEY;
    }
  });

  it('reports degraded when the database errors', async () => {
    respostas.dispositivos = { error: { message: 'boom' } };

    const resposta = await GET();
    expect(resposta.status).toBe(503);
    expect((await resposta.json()).status).toBe('degraded');
  });

  it('reports degraded without attempting database calls when unconfigured', async () => {
    dbConfigurado = false;

    const resposta = await GET();
    const corpo = await resposta.json();

    expect(resposta.status).toBe(503);
    expect(corpo.banco).toBe('indisponivel');
    expect(corpo.cache).toBe('indisponivel');
  });
});
