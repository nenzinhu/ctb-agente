/**
 * @jest-environment node
 */
/**
 * Integration tests for the admin API routes.
 *
 * Boundaries mocked: the Supabase client (a chainable stub) and next/headers
 * cookies (an in-memory store). Everything else — validation, status codes,
 * session handling — is the real route code.
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

const respostas: Record<string, { data: unknown; error: unknown; count?: number }> = {};
let dbConfigurado = true;

// Relative path on purpose: jest.mock resolves module ids with the default
// resolver, which does not understand the "@/" alias used by the app code.
jest.mock('../../lib/db/client', () => {
  const builder = (tabela: string) => {
    const chain: Record<string, unknown> = {};
    const resultado = () =>
      Promise.resolve(respostas[tabela] ?? { data: null, error: null, count: 0 });

    chain.select = () => chain;
    chain.order = () => chain;
    chain.limit = () => chain;
    chain.eq = () => chain;
    chain.neq = () => chain;
    chain.is = () => chain;
    chain.ilike = () => chain;
    chain.overlaps = () => chain;
    chain.gte = () => chain;
    chain.lt = () => chain;
    chain.maybeSingle = () => resultado();
    chain.single = () => resultado();
    chain.insert = () => resultado();
    chain.upsert = () => chain;
    chain.update = () => chain;
    chain.delete = () => chain;
    chain.then = (resolve: (value: unknown) => unknown) => resultado().then(resolve);

    return chain;
  };

  const client = { from: (tabela: string) => builder(tabela) };
  return {
    get databaseConfigured() {
      return dbConfigurado;
    },
    supabase: client,
    supabaseAdmin: client,
  };
});

import { NextRequest } from 'next/server';
import { POST as login } from '@/app/api/admin/login/route';
import { POST as logout } from '@/app/api/admin/logout/route';
import { GET as session } from '@/app/api/admin/session/route';
import { GET as documentos } from '@/app/api/admin/documents/route';
import { GET as estatisticas } from '@/app/api/admin/stats/route';

const COOKIE = 'admin_session';

/**
 * Build a JSON request for the route handlers
 * @param url - Route URL
 * @param body - JSON payload
 * @returns NextRequest instance
 */
function requisicao(url: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe('Admin API', () => {
  beforeEach(() => {
    cookieStore.clear();
    dbConfigurado = true;
    for (const chave of Object.keys(respostas)) delete respostas[chave];
  });

  describe('POST /api/admin/login', () => {
    it('rejects a request without credentials', async () => {
      const resposta = await login(requisicao('/api/admin/login', { username: 'nenzinhu' }));
      expect(resposta.status).toBe(400);
    });

    it('rejects an unknown username', async () => {
      const resposta = await login(
        requisicao('/api/admin/login', { username: 'intruso', password: 'x' })
      );
      expect(resposta.status).toBe(401);
      expect(cookieStore.has(COOKIE)).toBe(false);
    });

    it('accepts the master user and creates the session cookie', async () => {
      // No ADMIN_PASSWORD_HASH in the test env: the route runs in dev mode
      const resposta = await login(
        requisicao('/api/admin/login', { username: 'nenzinhu', password: 'qualquer' })
      );

      expect(resposta.status).toBe(200);
      expect(cookieStore.has(COOKIE)).toBe(true);
    });

    it('fails closed in production when the password hash is missing', async () => {
      const original = process.env.NODE_ENV;
      // @ts-expect-error NODE_ENV is read-only in the type definitions
      process.env.NODE_ENV = 'production';

      try {
        const resposta = await login(
          requisicao('/api/admin/login', { username: 'nenzinhu', password: 'qualquer' })
        );

        expect(resposta.status).toBe(503);
        expect((await resposta.json()).error).toBe('admin_not_configured');
        expect(cookieStore.has(COOKIE)).toBe(false);
      } finally {
        // @ts-expect-error restoring the original value
        process.env.NODE_ENV = original;
      }
    });
  });

  describe('GET /api/admin/session', () => {
    it('returns 401 without a session', async () => {
      const resposta = await session();
      expect(resposta.status).toBe(401);
    });

    it('returns 200 with a valid session', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));

      const resposta = await session();
      expect(resposta.status).toBe(200);
      await expect(resposta.json()).resolves.toEqual({ valid: true });
    });
  });

  describe('POST /api/admin/logout', () => {
    it('clears the session cookie', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));

      const resposta = await logout();
      expect(resposta.status).toBe(200);
      expect(cookieStore.has(COOKIE)).toBe(false);
    });
  });

  describe('GET /api/admin/documents', () => {
    const listar = (query = '') => documentos(new NextRequest(`http://localhost/api/admin/documents${query}`));

    it('returns 401 when not authenticated', async () => {
      const resposta = await listar();
      expect(resposta.status).toBe(401);
    });

    it('lists registered documents, legacy excerpt groups and pending vectors', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));
      const documento = { id: 'd1', colecao: 'ctb', titulo: 'CTB compilado', trechos: 812, trechos_sem_vetor: 0 };
      respostas.documentos = { data: [documento], error: null };
      respostas.dispositivos = {
        data: [
          { norma_id: 'ctb', tipo: 'lei' },
          { norma_id: 'ctb', tipo: 'lei' },
          { norma_id: 'res-432', tipo: 'resolucao' },
        ],
        error: null,
        count: 3,
      };

      const resposta = await listar('?colecao=ctb');
      expect(resposta.status).toBe(200);
      await expect(resposta.json()).resolves.toMatchObject({
        documentos: [documento],
        legado: [
          { norma_id: 'ctb', tipo: 'lei', trechos: 2 },
          { norma_id: 'res-432', tipo: 'resolucao', trechos: 1 },
        ],
        pendentesVetor: 3,
        migracaoPendente: false,
        bancoConfigurado: true,
      });
    });

    it('flags a missing migration 008 instead of failing', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));
      respostas.documentos = {
        data: null,
        error: { code: 'PGRST205', message: "Could not find the table 'public.documentos' in the schema cache" },
      };

      const resposta = await listar();
      expect(resposta.status).toBe(200);
      await expect(resposta.json()).resolves.toMatchObject({ documentos: [], migracaoPendente: true });
    });

    it('maps a database failure to 500', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));
      respostas.documentos = { data: null, error: { message: 'boom' } };

      const resposta = await listar();
      expect(resposta.status).toBe(500);
    });

    it('returns an empty list with a flag when the database is not configured', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));
      dbConfigurado = false;

      const resposta = await listar();
      expect(resposta.status).toBe(200);

      const corpo = await resposta.json();
      expect(corpo.documentos).toEqual([]);
      expect(corpo.bancoConfigurado).toBe(false);
    });
  });

  describe('GET /api/admin/stats', () => {
    it('returns 401 when not authenticated', async () => {
      const resposta = await estatisticas();
      expect(resposta.status).toBe(401);
    });

    it('reports zeroes instead of 500 when the database is not configured', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));
      dbConfigurado = false;

      const resposta = await estatisticas();
      expect(resposta.status).toBe(200);
      await expect(resposta.json()).resolves.toMatchObject({
        totalDocuments: 0,
        bancoConfigurado: false,
      });
    });

    it('aggregates counts by document type', async () => {
      await login(requisicao('/api/admin/login', { username: 'nenzinhu', password: 'x' }));
      respostas.dispositivos = {
        data: [
          { tipo: 'lei', data_publicacao: '2024-01-01' },
          { tipo: 'lei', data_publicacao: '2023-01-01' },
          { tipo: 'resolucao', data_publicacao: '2022-01-01' },
        ],
        error: null,
        count: 3,
      };

      const resposta = await estatisticas();
      expect(resposta.status).toBe(200);

      const corpo = await resposta.json();
      expect(corpo.totalDocuments).toBe(3);
      expect(corpo.byType).toEqual({ lei: 2, resolucao: 1 });
    });
  });
});
