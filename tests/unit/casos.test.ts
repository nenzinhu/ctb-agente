import { readFileSync } from 'node:fs';
import path from 'node:path';
import { casoDaFicha } from '@/lib/mbft/casos';
import type { FichaMbft } from '@/lib/mbft/parser';

const fichas = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/mbft-fichas.json'), 'utf8')) as FichaMbft[];
const ficha = (codigo: string) => fichas.find((f) => f.codigo === codigo)!;

describe('casoDaFicha', () => {
  it('copia os campos oficiais sem alterar o conteúdo', () => {
    const f = ficha('516-91');
    const caso = casoDaFicha(f);
    expect(caso.codigo).toBe('516-91');
    expect(caso.amparo).toBe('Art. 165');
    expect(caso.gravidade).toBe(f.gravidade);
    expect(caso.crime).toBe('Art. 306 e 310 do CTB');
    expect(caso.exemplos).toHaveLength(f.exemplos.length);
    expect(caso.exemplos[0]).toMatch(/^Condutor realizou teste de etilômetro/);
    expect(caso.quandoNaoAutuar.length).toBe(f.quandoNaoAutuar.filter(Boolean).length);
  });

  it('funciona para todas as fichas, sem inventar campos', () => {
    for (const f of fichas) {
      const caso = casoDaFicha(f);
      expect(caso.codigo).toBe(f.codigo);
      for (const e of caso.exemplos) expect(f.exemplos.some((o) => o.includes(e.slice(0, 15)))).toBe(true);
    }
  });
});
