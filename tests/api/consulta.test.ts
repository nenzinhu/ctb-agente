/**
 * @jest-environment node
 */
// Route tests for POST /api/consulta: status codes and payload shape
const handleConsulta = jest.fn();

jest.mock('../../app/api/consulta/handler', () => ({
  handleConsulta: (...args: unknown[]) => handleConsulta(...args),
}));

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/consulta/route';
import { emptyCard } from '@/lib/response/card-builder';

/**
 * Build a POST request for the consultation route
 * @param body - Raw body string
 * @param headers - Extra headers
 * @returns NextRequest
 */
function post(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/consulta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

describe('POST /api/consulta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects an invalid JSON body with 400', async () => {
    const resposta = await POST(post('{nope'));
    expect(resposta.status).toBe(400);
    expect((await resposta.json()).error).toBe('invalid_json');
  });

  it('rejects a too-short query with 400 and explains the field', async () => {
    const resposta = await POST(post(JSON.stringify({ consulta: 'ab' })));

    expect(resposta.status).toBe(400);
    const corpo = await resposta.json();
    expect(corpo.error).toBe('validation_error');
    expect(corpo.issues[0].campo).toBe('consulta');
  });

  it('returns the card on success and forwards the client IP', async () => {
    handleConsulta.mockResolvedValue({
      card: { ...emptyCard('516-91', 'codigo'), sucesso: true },
      sucesso: true,
      tempo_ms: 12,
      cache_hit: false,
    });

    const resposta = await POST(
      post(JSON.stringify({ consulta: '516-91', turnstileToken: 'tok' }), {
        'x-forwarded-for': '203.0.113.7, 10.0.0.1',
      })
    );

    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo.card.consulta).toBe('516-91');
    expect(handleConsulta).toHaveBeenCalledWith('516-91', '203.0.113.7', 'tok');
  });

  it('maps a rate limit failure to 429', async () => {
    handleConsulta.mockResolvedValue({
      card: emptyCard('516-91', 'codigo'),
      sucesso: false,
      tempo_ms: 1,
      cache_hit: false,
      error: 'rate_limit_exceeded',
    });

    const resposta = await POST(post(JSON.stringify({ consulta: '516-91' })));
    expect(resposta.status).toBe(429);
    expect((await resposta.json()).message).toMatch(/Limite de consultas/);
  });

  it('maps a blocked IP to 403', async () => {
    handleConsulta.mockResolvedValue({
      card: emptyCard('x', 'situacao'),
      sucesso: false,
      tempo_ms: 1,
      cache_hit: false,
      error: 'ip_blocked',
    });

    expect((await POST(post(JSON.stringify({ consulta: 'consulta' })))).status).toBe(403);
  });

  it('maps a Turnstile failure to 403', async () => {
    handleConsulta.mockResolvedValue({
      card: emptyCard('x', 'situacao'),
      sucesso: false,
      tempo_ms: 1,
      cache_hit: false,
      error: 'turnstile_failed',
    });

    const resposta = await POST(post(JSON.stringify({ consulta: 'consulta' })));
    expect(resposta.status).toBe(403);
    expect((await resposta.json()).message).toMatch(/anti-bot/);
  });

  it('maps an internal failure to 500', async () => {
    handleConsulta.mockResolvedValue({
      card: emptyCard('x', 'situacao'),
      sucesso: false,
      tempo_ms: 1,
      cache_hit: false,
      error: 'internal_error',
    });

    expect((await POST(post(JSON.stringify({ consulta: 'consulta' })))).status).toBe(500);
  });

  it('falls back to "unknown" when no IP header is present', async () => {
    handleConsulta.mockResolvedValue({
      card: emptyCard('x', 'situacao'),
      sucesso: true,
      tempo_ms: 1,
      cache_hit: false,
    });

    await POST(post(JSON.stringify({ consulta: 'art. 165' })));
    expect(handleConsulta).toHaveBeenCalledWith('art. 165', 'unknown', undefined);
  });
});
