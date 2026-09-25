/**
 * @jest-environment node
 */
// Tests for GET /api/cron/clear-cache (Vercel Cron target)
const clearExpiredCache = jest.fn(async () => 4);

jest.mock('../../lib/response/cache', () => ({
  clearExpiredCache: () => clearExpiredCache(),
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/clear-cache/route';

function requisicao(auth?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/clear-cache', {
    method: 'GET',
    headers: auth ? { authorization: auth } : {},
  });
}

describe('GET /api/cron/clear-cache', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('rejects without the CRON_SECRET configured (locked by default)', async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(requisicao('Bearer x'))).status).toBe(401);
  });

  it('rejects a wrong bearer token', async () => {
    process.env.CRON_SECRET = 'segredo';
    expect((await GET(requisicao('Bearer errado'))).status).toBe(401);
    expect((await GET(requisicao())).status).toBe(401);
  });

  it('purges the expired entries with the right token', async () => {
    process.env.CRON_SECRET = 'segredo';

    const resposta = await GET(requisicao('Bearer segredo'));
    expect(resposta.status).toBe(200);

    const corpo = await resposta.json();
    expect(corpo.ok).toBe(true);
    expect(corpo.removidos).toBe(4);
    expect(clearExpiredCache).toHaveBeenCalled();
  });
});
