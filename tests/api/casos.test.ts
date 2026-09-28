/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/casos/route';

const pedir = (q = '') => GET(new NextRequest(`http://localhost/api/casos${q}`));

describe('GET /api/casos', () => {
  it('sem tema, devolve um caso qualquer', async () => {
    const r = pedir();
    expect(r.status).toBe(200);
    expect((await r.json()).opcoes).toHaveLength(4);
  });

  it('com gíria, o caso é do tema', async () => {
    for (let i = 0; i < 10; i++) {
      const caso = await pedir('?tema=zap').json();
      expect(['763-31', '763-32', '736-62']).toContain(caso.correta);
    }
  });

  it('com código, o caso é daquela ficha', async () => {
    expect((await pedir('?tema=516-91').json()).correta).toBe('516-91');
  });

  it('tema sem resultado devolve 404 com mensagem clara', async () => {
    const r = pedir('?tema=xyzxyz');
    expect(r.status).toBe(404);
    expect((await r.json()).message).toMatch(/Nenhum caso para “xyzxyz”/);
  });
});
