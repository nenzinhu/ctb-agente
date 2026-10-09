/**
 * @jest-environment node
 */
// Cache invalidation (bump) + per-row TTL purge (migration 007)
let rpcCalls: { fn: string }[] = [];
let rpcError: unknown = null;
let rpcData: unknown = 7;
let deleted: boolean = false;
let dbConfigurado = true;

jest.mock('../../lib/db/client', () => {
  const adminChain = () => {
    const chain: Record<string, unknown> = {};
    chain.delete = () => {
      deleted = true;
      return chain;
    };
    chain.lt = () => chain;
    chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ error: null }).then(resolve);
    return chain;
  };
  return {
    get databaseConfigured() {
      return dbConfigurado;
    },
    get databaseAdminConfigured() {
      return dbConfigurado;
    },
    supabase: {},
    supabaseAdmin: {
      rpc: (fn: string) => {
        rpcCalls.push({ fn });
        return rpcError
          ? Promise.resolve({ data: null, error: rpcError })
          : Promise.resolve({ data: rpcData, error: null });
      },
      from: () => adminChain(),
    },
  };
});

import { clearExpiredCache, invalidateResponseCache } from '@/lib/response/cache';

describe('invalidateResponseCache', () => {
  beforeEach(() => {
    rpcCalls = [];
    rpcError = null;
    rpcData = 7;
    deleted = false;
    dbConfigurado = true;
  });

  it('calls bump_corpus_version and reports the removed count', async () => {
    await expect(invalidateResponseCache()).resolves.toBe(7);
    expect(rpcCalls).toEqual([{ fn: 'bump_corpus_version' }]);
    expect(deleted).toBe(false);
  });

  it('returns -1 when the RPC fails', async () => {
    rpcError = { message: 'boom' };
    await expect(invalidateResponseCache()).resolves.toBe(-1);
  });

  it('returns -1 when the database is unconfigured', async () => {
    dbConfigurado = false;
    await expect(invalidateResponseCache()).resolves.toBe(-1);
    expect(rpcCalls).toHaveLength(0);
  });
});

describe('clearExpiredCache', () => {
  beforeEach(() => {
    rpcCalls = [];
    rpcError = null;
    rpcData = 3;
    deleted = false;
    dbConfigurado = true;
  });

  it('uses the purge RPC and reports the removed count', async () => {
    await expect(clearExpiredCache()).resolves.toBe(3);
    expect(rpcCalls).toEqual([{ fn: 'purge_expired_cache' }]);
  });

  it('falls back to a plain delete when the RPC is missing', async () => {
    rpcError = { code: 'PGRST202', message: 'Could not find the function purge_expired_cache' };

    await expect(clearExpiredCache()).resolves.toBe(-1); // legacy path cannot count
    expect(deleted).toBe(true);
  });

  it('returns 0 for a non-migration RPC failure', async () => {
    rpcError = { message: 'conexão recusada' };

    await expect(clearExpiredCache()).resolves.toBe(0);
    expect(deleted).toBe(false);
  });
});
