/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/fatos-pmsc/route';

const post = (body: unknown) => POST(new NextRequest('http://localhost/api/fatos-pmsc', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
}));

describe('POST /api/fatos-pmsc', () => {
  it('retorna até três alternativas sem decisão automática', async () => {
    const response = await post({ consulta: 'som alto perturbando os vizinhos' });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.decisaoAutomatica).toBe(false);
    expect(body.alternativas.length).toBeLessThanOrEqual(3);
    expect(body.alternativas[0].natureza).toMatch(/sossego/i);
  });

  it('valida a consulta, filtra PII e desabilita cache', async () => {
    expect((await post({ consulta: 'oi' })).status).toBe(400);
    const response = await post({ consulta: 'som alto na placa ABC1D23' });
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(JSON.stringify(await response.json())).not.toContain('ABC1D23');
  });
});
