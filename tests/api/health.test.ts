/**
 * @jest-environment node
 */
// Tests for GET /api/health
const respostas: Record<string, { error: unknown; count?: number }> = {};
let dbConfigurado = true;

jest.mock('../../lib/db/client', () => ({
  get databaseConfigured() {
    return dbConfigurado;
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
  },
  supabaseAdmin: {},
}));

import { GET } from '@/app/api/health/route';

describe('GET /api/health', () => {
  beforeEach(() => {
    dbConfigurado = true;
    for (const chave of Object.keys(respostas)) delete respostas[chave];
  });

  it('reports ok when the database answers', async () => {
    const resposta = await GET();
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(corpo.status).toBe('ok');
    expect(corpo.banco).toBe('ok');
    expect(corpo).toHaveProperty('versao');
    expect(Array.isArray(corpo.provedoresAusentes)).toBe(true);
    expect(corpo.configuracoes).toMatchObject({ consultas_por_hora: expect.any(Number) });
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
