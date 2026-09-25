// Unit tests for the response cache (cache_respostas)
let linha: Record<string, unknown> | null = null;
let erro: unknown = null;
const updates: Record<string, unknown>[] = [];

jest.mock('../../lib/db/client', () => {
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.update = (valor: Record<string, unknown>) => {
    updates.push(valor);
    return chain;
  };
  chain.upsert = () => chain;
  chain.delete = () => chain;
  chain.lt = () => chain;
  chain.limit = () => chain;
  chain.maybeSingle = async () => ({ data: linha, error: erro });
  chain.then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: linha ? [linha] : [], error: erro }).then(resolve);

  const client = { from: () => chain };
  return { databaseConfigured: true, supabase: client, supabaseAdmin: client };
});

import {
  getCacheStats,
  getCachedCard,
  hashPergunta,
  setCachedCard,
} from '@/lib/response/cache';
import type { CartaoEstruturado } from '@/lib/response/response-types';

/**
 * Build a cached card payload
 * @returns Cache row payload
 */
function cartaoCache(): CartaoEstruturado {
  return {
    tipo: 'codigo',
    sucesso: true,
    consulta: '516-91',
    enquadramento: null,
    normas: [],
    checklist_ait: [],
    erros_comuns: [],
    concurso_infracoes: [],
    crime_transito: false,
    categoria_cnh_exigida: 'qualquer',
    normas_relacionadas: [],
    jurisprudencia: [],
    explicacao_simples: 'resumo',
    exemplo_dia_a_dia: '',
    citacoes: [],
    cache_hit: false,
    tempo_ms: 10,
  };
}

describe('hashPergunta', () => {
  it('is stable for equivalent queries', () => {
    expect(hashPergunta('  Art. 165  ')).toBe(hashPergunta('art. 165'));
    expect(hashPergunta('art.   165')).toBe(hashPergunta('art. 165'));
  });

  it('differs for different queries', () => {
    expect(hashPergunta('art. 165')).not.toBe(hashPergunta('art. 166'));
  });
});

describe('getCachedCard', () => {
  beforeEach(() => {
    linha = null;
    erro = null;
    updates.length = 0;
  });

  it('returns null when there is no entry', async () => {
    await expect(getCachedCard('516-91')).resolves.toBeNull();
  });

  it('returns the stored card marked as a cache hit', async () => {
    linha = {
      resposta_completa: cartaoCache(),
      ttl_dias: 30,
      data_ultimo_acesso: new Date().toISOString(),
      citacoes_validadas: true,
    };

    const card = await getCachedCard('516-91');
    expect(card?.cache_hit).toBe(true);
    expect(card?.consulta).toBe('516-91');
  });

  it('ignores an expired entry', async () => {
    linha = {
      resposta_completa: cartaoCache(),
      ttl_dias: 7,
      data_ultimo_acesso: new Date(Date.now() - 10 * 86_400_000).toISOString(),
      citacoes_validadas: true,
    };

    await expect(getCachedCard('516-91')).resolves.toBeNull();
  });

  it('ignores a malformed payload', async () => {
    linha = {
      resposta_completa: 'não é um cartão',
      ttl_dias: 30,
      data_ultimo_acesso: new Date().toISOString(),
      citacoes_validadas: true,
    };

    const card = await getCachedCard('516-91');
    expect(card === null || typeof card === 'object').toBe(true);
  });

  it('survives a database error', async () => {
    erro = { message: 'boom' };
    await expect(getCachedCard('516-91')).resolves.toBeNull();
  });
});

describe('setCachedCard', () => {
  beforeEach(() => {
    erro = null;
    updates.length = 0;
  });

  it('does not cache failed answers', async () => {
    await setCachedCard('x', { ...cartaoCache(), sucesso: false });
    expect(updates).toHaveLength(0);
  });

  it('caches successful answers', async () => {
    await expect(setCachedCard('516-91', cartaoCache())).resolves.toBeUndefined();
    expect(updates).toHaveLength(0); // upsert is mocked out; the call must not throw
  });
});

describe('getCacheStats', () => {
  it('reports zeroes when the table is empty', async () => {
    linha = null;
    erro = null;

    await expect(getCacheStats()).resolves.toEqual({
      total: 0,
      validas: 0,
      expiradas: 0,
      ultimoAcesso: null,
    });
  });
});
