/**
 * @jest-environment node
 */
// Admin API tests: limits, usage, providers and enquadramentos
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

const settings = { consultas_por_hora: 30, turnstile_ativo: true };
const updateSettings = jest.fn(async (patch: Partial<typeof settings>) => ({
  ...settings,
  ...patch,
}));
const listBlockedIps = jest.fn(async (..._args: unknown[]) => ['203.0.113.9']);
const blockIp = jest.fn(async (..._args: unknown[]) => undefined);
const unblockIp = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock('../../lib/config/settings', () => ({
  // Inline literal: jest.mock factories are hoisted, so referencing the module
  // scope const directly here would hit the temporal dead zone.
  DEFAULT_SETTINGS: { consultas_por_hora: 30, turnstile_ativo: true },
  getSettings: async () => settings,
  updateSettings: (patch: Partial<typeof settings>) => updateSettings(patch),
  sanitizeRateLimit: (valor: number) => Math.min(1000, Math.max(1, Math.trunc(valor || 1))),
  listBlockedIps: () => listBlockedIps(),
  blockIp: (...args: unknown[]) => blockIp(...args),
  unblockIp: (...args: unknown[]) => unblockIp(...args),
  isIpBlocked: async () => false,
  invalidateSettingsCache: () => undefined,
}));

const getUsageStats = jest.fn(async (_dias: number) => ({
  porDia: [{ dia: '2026-09-22', consultas: 4, cacheHits: 1, falhas: 1 }],
  total: 4,
  cacheHits: 1,
  falhas: 1,
  perguntasSemResposta: [{ pergunta: 'será que pode?', timestamp: '2026-09-22T10:00:00Z' }],
  provedoresComFalha: [{ modelo: 'Groq', falhas: 1 }],
}));

jest.mock('../../lib/ratelimit/limiter', () => ({
  getUsageStats: (...args: unknown[]) => getUsageStats(...(args as [number])),
}));

const getCacheStats = jest.fn(async () => ({
  total: 3,
  validas: 2,
  expiradas: 1,
  ultimoAcesso: '2026-09-22T10:00:00Z',
}));

jest.mock('../../lib/response/cache', () => ({
  getCacheStats: () => getCacheStats(),
  invalidateResponseCache: jest.fn(async () => 0),
}));

const listProviders = jest.fn(() => [
  { id: 'groq', nome: 'Groq', envVar: 'GROQ_API_KEY', modeloPadrao: 'llama', papel: 'x', ordem: 1, configurado: false },
]);
interface PingResultLike {
  provider: string;
  ok: boolean;
  modeloUsado: string;
  latenciaMs: number;
  resposta?: string;
  erro?: string;
}

const pingProvider = jest.fn(
  async (..._args: unknown[]): Promise<PingResultLike> => ({
    provider: 'Groq',
    ok: true,
    modeloUsado: 'llama',
    latenciaMs: 120,
    resposta: 'ok',
  })
);

jest.mock('../../lib/ai/providers/registry', () => ({
  listProviders: () => listProviders(),
  pingProvider: (id: string) => pingProvider(id),
}));

const listEnquadramentos = jest.fn(async (..._args: unknown[]) => [{ codigo_mbft: '516-91' }]);
const upsertEnquadramento = jest.fn(async (...args: unknown[]) => args[0]);
const deleteEnquadramento = jest.fn(async (..._args: unknown[]) => undefined);

jest.mock('../../lib/db/queries', () => ({
  listEnquadramentos: () => listEnquadramentos(),
  upsertEnquadramento: (...args: unknown[]) => upsertEnquadramento(...args),
  deleteEnquadramento: (...args: unknown[]) => deleteEnquadramento(...args),
}));

// The route short-circuits with a clear message when Supabase is not configured.
// Simulated with credentials present, which is what the mocked queries represent.
let bancoConfigurado = true;

jest.mock('../../lib/db/client', () => ({
  get databaseConfigured() {
    return bancoConfigurado;
  },
  supabase: {},
  supabaseAdmin: {},
}));

import { NextRequest } from 'next/server';
import { createSession } from '@/lib/auth/session';
import { GET as getLimites, POST as blockIP, PUT as putLimites, DELETE as deleteIP } from '@/app/api/admin/limites/route';
import { GET as getUso } from '@/app/api/admin/uso/route';
import { GET as getProviders, POST as postProvider } from '@/app/api/admin/providers/route';
import {
  DELETE as deleteEnquadramentoRoute,
  GET as getEnquadramentos,
  POST as postEnquadramento,
} from '@/app/api/admin/enquadramentos/route';

/**
 * Build a JSON request
 * @param url - Route path
 * @param body - Payload
 * @param method - HTTP method
 * @returns NextRequest
 */
function requisicao(url: string, body?: unknown, method = 'POST'): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Admin configuration API', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    cookieStore.clear();
    await createSession('nenzinhu');
  });

  describe('GET /api/admin/limites', () => {
    it('returns 401 without a session', async () => {
      cookieStore.clear();
      expect((await getLimites()).status).toBe(401);
    });

    it('returns the settings and the block list', async () => {
      const resposta = await getLimites();
      expect(resposta.status).toBe(200);

      const corpo = await resposta.json();
      expect(corpo.settings.consultas_por_hora).toBe(30);
      expect(corpo.ipBloqueados).toEqual(['203.0.113.9']);
      expect(corpo).toHaveProperty('turnstileConfigurado');
    });
  });

  describe('PUT /api/admin/limites', () => {
    it('rejects an out-of-range value with 400', async () => {
      const resposta = await putLimites(
        requisicao('/api/admin/limites', { consultas_por_hora: 99999 }, 'PUT')
      );
      expect(resposta.status).toBe(400);
      expect(updateSettings).not.toHaveBeenCalled();
    });

    it('persists a valid change', async () => {
      const resposta = await putLimites(
        requisicao('/api/admin/limites', { consultas_por_hora: 45, turnstile_ativo: false }, 'PUT')
      );

      expect(resposta.status).toBe(200);
      expect(updateSettings).toHaveBeenCalledWith({ consultas_por_hora: 45, turnstile_ativo: false });
    });

    it('returns 500 when persisting fails', async () => {
      updateSettings.mockRejectedValueOnce(new Error('boom'));

      const resposta = await putLimites(
        requisicao('/api/admin/limites', { consultas_por_hora: 10 }, 'PUT')
      );
      expect(resposta.status).toBe(500);
    });
  });

  describe('IP block list', () => {
    it('blocks an IP', async () => {
      const resposta = await blockIP(
        requisicao('/api/admin/limites', { ip: '198.51.100.7', motivo: 'abuso' })
      );

      expect(resposta.status).toBe(200);
      expect(blockIp).toHaveBeenCalledWith('198.51.100.7', 'abuso');
    });

    it('rejects a malformed payload', async () => {
      expect((await blockIP(requisicao('/api/admin/limites', { ip: '' }))).status).toBe(400);
    });

    it('unblocks an IP', async () => {
      const resposta = await deleteIP(
        new NextRequest('http://localhost/api/admin/limites?ip=198.51.100.7', { method: 'DELETE' })
      );

      expect(resposta.status).toBe(200);
      expect(unblockIp).toHaveBeenCalledWith('198.51.100.7');
    });

    it('requires the ip parameter', async () => {
      const resposta = await deleteIP(
        new NextRequest('http://localhost/api/admin/limites', { method: 'DELETE' })
      );
      expect(resposta.status).toBe(400);
    });
  });

  describe('GET /api/admin/uso', () => {
    it('computes the cache hit rate', async () => {
      const resposta = await getUso(new NextRequest('http://localhost/api/admin/uso?dias=7'));
      expect(resposta.status).toBe(200);

      const corpo = await resposta.json();
      expect(corpo.janelaDias).toBe(7);
      expect(corpo.taxaCache).toBe(25);
      expect(corpo.perguntasSemResposta).toHaveLength(1);
      expect(getUsageStats).toHaveBeenCalledWith(7);
    });

    it('clamps the window to a sane range', async () => {
      await getUso(new NextRequest('http://localhost/api/admin/uso?dias=9999'));
      expect(getUsageStats).toHaveBeenCalledWith(365);
    });

    it('returns 401 without a session', async () => {
      cookieStore.clear();
      expect(
        (await getUso(new NextRequest('http://localhost/api/admin/uso'))).status
      ).toBe(401);
    });
  });

  describe('/api/admin/providers', () => {
    it('lists the chain for an authenticated master', async () => {
      const resposta = await getProviders();
      expect(resposta.status).toBe(200);
      expect((await resposta.json()).providers[0].envVar).toBe('GROQ_API_KEY');
    });

    it('pings a provider', async () => {
      const resposta = await postProvider(requisicao('/api/admin/providers', { providerId: 'groq' }));
      expect(resposta.status).toBe(200);
      expect((await resposta.json()).ok).toBe(true);
    });

    it('requires a provider id', async () => {
      expect((await postProvider(requisicao('/api/admin/providers', {}))).status).toBe(400);
    });

    it('responds 502 when the ping fails', async () => {
      pingProvider.mockResolvedValueOnce({
        provider: 'Groq',
        ok: false,
        modeloUsado: 'llama',
        latenciaMs: 5,
        erro: 'sem chave',
      });

      const resposta = await postProvider(requisicao('/api/admin/providers', { providerId: 'groq' }));
      expect(resposta.status).toBe(502);
    });
  });

  describe('/api/admin/enquadramentos', () => {
    it('lists the codes', async () => {
      const resposta = await getEnquadramentos();
      expect(resposta.status).toBe(200);
      expect((await resposta.json()).enquadramentos).toHaveLength(1);
    });

    it('rejects an invalid payload with field details', async () => {
      const resposta = await postEnquadramento(
        requisicao('/api/admin/enquadramentos', { codigo_mbft: '123' })
      );

      expect(resposta.status).toBe(400);
      const corpo = await resposta.json();
      expect(corpo.error).toBe('validation_error');
      expect(corpo.issues.length).toBeGreaterThan(0);
      expect(upsertEnquadramento).not.toHaveBeenCalled();
    });

    it('upserts a valid code', async () => {
      const resposta = await postEnquadramento(
        requisicao('/api/admin/enquadramentos', {
          codigo_mbft: '516-91',
          descricao: 'Estacionar em vaga de idoso',
          gravidade: 'gravíssima',
          pontos: 7,
          valor_multa: 29347,
          unidade: 'UIRF',
          amparo_legal: 'art. 181 XX do CTB',
          responsavel: 'proprietario',
        })
      );

      expect(resposta.status).toBe(200);
      expect(upsertEnquadramento).toHaveBeenCalledTimes(1);
    });

    it('deletes by code', async () => {
      const resposta = await deleteEnquadramentoRoute(
        new NextRequest('http://localhost/api/admin/enquadramentos?codigo=516-91', {
          method: 'DELETE',
        })
      );

      expect(resposta.status).toBe(200);
      expect(deleteEnquadramento).toHaveBeenCalledWith('516-91');
    });

    it('answers 503 with an actionable message when Supabase is absent', async () => {
      bancoConfigurado = false;
      try {
        const resposta = await postEnquadramento(
          requisicao('/api/admin/enquadramentos', {
            codigo_mbft: '516-91',
            descricao: 'Estacionar em vaga de idoso',
            gravidade: 'gravíssima',
            pontos: 7,
            valor_multa: 29347,
            unidade: 'UIRF',
            amparo_legal: 'art. 181 XX do CTB',
            responsavel: 'proprietario',
          })
        );

        expect(resposta.status).toBe(503);
        const corpo = await resposta.json();
        expect(corpo.error).toBe('database_not_configured');
        expect(corpo.message).toMatch(/NEXT_PUBLIC_SUPABASE_URL/);
        expect(upsertEnquadramento).not.toHaveBeenCalled();
      } finally {
        bancoConfigurado = true;
      }
    });

    it('lists nothing with a warning banner when Supabase is absent', async () => {
      bancoConfigurado = false;
      try {
        const resposta = await getEnquadramentos();

        expect(resposta.status).toBe(200);
        const corpo = await resposta.json();
        expect(corpo.enquadramentos).toEqual([]);
        expect(corpo.aviso).toMatch(/Banco de dados não configurado/);
        expect(listEnquadramentos).not.toHaveBeenCalled();
      } finally {
        bancoConfigurado = true;
      }
    });

    it('requires the codigo parameter', async () => {
      const resposta = await deleteEnquadramentoRoute(
        new NextRequest('http://localhost/api/admin/enquadramentos', { method: 'DELETE' })
      );
      expect(resposta.status).toBe(400);
    });
  });
});
