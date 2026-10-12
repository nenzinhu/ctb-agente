/** @jest-environment node */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/estrangeiros/consultar/route';

function requisicao(body: unknown) {
  return new NextRequest('http://localhost/api/estrangeiros/consultar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/estrangeiros/consultar', () => {
  it('combina o motor determinístico com trechos oficiais citados', async () => {
    const resposta = await POST(requisicao({ pergunta: 'argentino com carteira vencida há menos de 180 dias' }));
    expect(resposta.status).toBe(200);
    const corpo = await resposta.json();
    expect(corpo.fatos).toMatchObject({ paisHabilitacao: 'AR', habilitacao: 'vencida' });
    expect(corpo.trechos.length).toBeGreaterThan(0);
    expect(corpo.trechos[0]).toEqual(expect.objectContaining({ titulo: expect.any(String), referencia: expect.any(String), texto: expect.any(String) }));
  });

  it('rejeita texto vazio ou maior que 500 caracteres', async () => {
    expect((await POST(requisicao({ pergunta: '' }))).status).toBe(400);
    expect((await POST(requisicao({ pergunta: 'x'.repeat(501) }))).status).toBe(400);
  });

  it('informa os instrumentos do país sem dispensar a conferência humana', async () => {
    const resposta = await POST(requisicao({ pergunta: 'condutor argentino com habilitação válida' }));
    const corpo = await resposta.json();
    expect(corpo.estado).toBe('requer_conferencia');
    expect(corpo.baseInternacional).toMatch(/Argentina.*outros tratados/i);
    expect(corpo.baseInternacional).toMatch(/conferência/i);
  });
});
