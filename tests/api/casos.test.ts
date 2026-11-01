/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/casos/route';

const pedir = (q: string) => GET(new NextRequest(`http://localhost/api/casos${q}`));
const codigos = (lista: Array<{ codigo: string }>) => lista.map((c) => c.codigo);

describe('GET /api/casos', () => {
  it('situação comum → a conduta exata primeiro, parecidas à parte', async () => {
    const r = await pedir('?tema=carro estacionado na calçada').json();
    expect(codigos(r.principais)).toEqual(['545-21']);
    expect(codigos(r.relacionadas)).not.toContain('545-21');
  });

  it('recusa do bafômetro → 757-90 como conduta indicada', async () => {
    expect(codigos((await pedir('?tema=recusou o bafômetro').json()).principais)).toEqual(['757-90']);
  });

  it('código → exatamente aquela ficha, sem relacionadas', async () => {
    const r = await pedir('?tema=516-91').json();
    expect(codigos(r.principais)).toEqual(['516-91']);
    expect(r.relacionadas).toEqual([]);
  });

  it('artigo → as fichas do artigo', async () => {
    for (const c of (await pedir('?tema=art. 252').json()).principais) expect(c.amparo).toMatch(/^Art\. 252/);
  });

  it('sem tema → 400; tema sem ficha → 404 com mensagem clara', async () => {
    expect(pedir('').status).toBe(400);
    const r = pedir('?tema=xyzxyz');
    expect(r.status).toBe(404);
    expect((await r.json()).message).toMatch(/Nenhuma ficha do MBFT para “xyzxyz”/);
  });
});
