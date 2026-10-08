/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/enquadramento-guiado/route';

const post = (body: string) => POST(new NextRequest('http://localhost/api/enquadramento-guiado', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body,
}));

describe('POST /api/enquadramento-guiado', () => {
  it('valida o corpo da solicitação', async () => {
    expect((await post('{')).status).toBe(400);
    expect((await post(JSON.stringify({ descricao: 'oi' }))).status).toBe(400);
  });

  it('filtra dados pessoais e nunca permite cache da resposta', async () => {
    const response = await post(JSON.stringify({ descricao: 'condutor digitava no celular, placa ABC1D23' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(JSON.stringify(body)).not.toContain('ABC1D23');
    expect(body.decisaoAutomatica).toBe(false);
  });
});
