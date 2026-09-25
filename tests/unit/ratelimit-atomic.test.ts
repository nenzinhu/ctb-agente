/**
 * @jest-environment node
 */
// Atomic rate limit (migration 007): RPC path, legacy fallback and recordQuery
let rpcError: unknown = null;
let rpcData: unknown = { id: 'row-1', usadas: 1, permitido: true, restantes: 29, limite: 30 };
let inserted: Record<string, unknown>[] = [];
let updated: { id: string; valores: Record<string, unknown> }[] = [];
let dbConfigurado = true;

jest.mock('../../lib/db/client', () => {
  const adminChain = () => {
    const chain: Record<string, unknown> = {};
    chain.update = (valores: Record<string, unknown>) => {
      chain.__valores = valores;
      return chain;
    };
    chain.eq = (campo: string, id: string) => {
      if (campo === 'id') updated.push({ id, valores: (chain.__valores ?? {}) as Record<string, unknown> });
      return chain;
    };
    chain.insert = (linha: Record<string, unknown>) => {
      inserted.push(linha);
      return chain;
    };
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
    return chain;
  };
  return {
    get databaseConfigured() {
      return dbConfigurado;
    },
    supabase: {},
    supabaseAdmin: {
      rpc: () =>
        rpcError
          ? Promise.resolve({ data: null, error: rpcError })
          : Promise.resolve({ data: rpcData, error: null }),
      from: () => adminChain(),
    },
  };
});

jest.mock('../../lib/config/settings', () => ({
  getSettings: async () => ({ consultas_por_hora: 30, turnstile_ativo: false }),
  isIpBlocked: async () => false,
}));

import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';

describe('checkRateLimit (atomic RPC)', () => {
  beforeEach(() => {
    rpcError = null;
    rpcData = { id: 'row-1', usadas: 1, permitido: true, restantes: 29, limite: 30 };
    inserted = [];
    updated = [];
    dbConfigurado = true;
  });

  it('reserves the row and returns the RPC decision', async () => {
    const resultado = await checkRateLimit('10.0.0.1', { tipo: 'codigo', pergunta: '516-91' });

    expect(resultado.allowed).toBe(true);
    expect(resultado.remaining).toBe(29);
    expect(resultado.registroId).toBe('row-1');
  });

  it('refuses when the RPC says the limit is reached', async () => {
    rpcData = { id: 'row-31', usadas: 31, permitido: false, restantes: 0, limite: 30 };

    const resultado = await checkRateLimit('10.0.0.1');
    expect(resultado.allowed).toBe(false);
    expect(resultado.registroId).toBe('row-31');
  });

  it('fails open when the RPC errors for another reason', async () => {
    rpcError = { message: 'conexão recusada' };

    const resultado = await checkRateLimit('10.0.0.1');
    expect(resultado.allowed).toBe(true);
    expect(resultado.registroId).toBeNull();
  });

  it('falls back to count-then-check when the RPC is missing (migration pending)', async () => {
    rpcError = { code: 'PGRST202', message: 'Could not find the function register_query_and_check_limit' };
    dbConfigurado = true;

    const resultado = await checkRateLimit('10.0.0.1');
    // Legacy path: no reserved row, decision made by count only.
    expect(resultado.allowed).toBe(true);
    expect(resultado.registroId).toBeNull();
  });
});

describe('recordQuery', () => {
  beforeEach(() => {
    inserted = [];
    updated = [];
    dbConfigurado = true;
  });

  it('updates the reserved row instead of inserting a second one', async () => {
    await recordQuery('10.0.0.1', '516-91', { sucesso: true, tempoMs: 12 }, 'row-1');

    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe('row-1');
    expect(updated[0].valores.sucesso).toBe(true);
    expect(inserted).toHaveLength(0);
  });

  it('inserts directly when there is no reserved row (legacy/failed RPC)', async () => {
    await recordQuery('10.0.0.1', '516-91', { sucesso: true, tempoMs: 12 });

    expect(inserted).toHaveLength(1);
    expect(inserted[0].pergunta).toBe('516-91');
    expect(updated).toHaveLength(0);
  });

  it('does nothing when the database is unconfigured', async () => {
    dbConfigurado = false;
    await recordQuery('10.0.0.1', '516-91');
    expect(inserted).toHaveLength(0);
  });
});
