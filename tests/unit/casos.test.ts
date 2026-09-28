import { readFileSync } from 'node:fs';
import path from 'node:path';
import { montarCaso } from '@/lib/mbft/casos';
import type { FichaMbft } from '@/lib/mbft/parser';

const fichas = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/mbft-fichas.json'), 'utf8')) as FichaMbft[];

/** Deterministic random for reproducible cases */
function semente(n: number) {
  let a = n * 2654435761;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

describe('montarCaso', () => {
  it('gera 200 casos válidos: 4 opções distintas, uma correta, sem entregar o código na cena', () => {
    for (let i = 1; i <= 200; i++) {
      const caso = montarCaso(fichas, semente(i));
      expect(caso.opcoes).toHaveLength(4);
      expect(new Set(caso.opcoes.map((o) => o.codigo)).size).toBe(4);
      expect(new Set(caso.opcoes.map((o) => o.rotulo)).size).toBe(4);
      expect(caso.opcoes.filter((o) => o.codigo === caso.correta)).toHaveLength(1);
      expect(caso.cena).not.toMatch(/\d{3}-\d{2}/);
      expect(caso.cena).not.toMatch(/^\d+\.\s/);
      expect(caso.cena.length).toBeGreaterThanOrEqual(25);
      const certa = fichas.find((f) => f.codigo === caso.correta)!;
      expect(certa.exemplos.some((e) => e.includes(caso.cena.slice(0, 20)))).toBe(true);
    }
  });

  it('as alternativas erradas são parecidas (mesmo artigo ou código vizinho)', () => {
    const caso = montarCaso(
      fichas.filter((f) => f.amparoLegal.startsWith('Art. 252') || f.codigo === '763-31'),
      semente(7)
    );
    for (const o of caso.opcoes) expect(o.amparo).toMatch(/^Art\. 252/);
  });

  it('traz o "Explicando fácil" quando a infração está no mapa de intenções', () => {
    const so = fichas.filter((f) => ['516-91', '757-90', '516-92', '501-00', '763-31'].includes(f.codigo));
    let achou = false;
    for (let i = 1; i < 30 && !achou; i++) {
      const caso = montarCaso(so, semente(i));
      if (caso.correta === '516-91') {
        expect(caso.explicacao).toMatch(/cerveja/);
        achou = true;
      }
    }
    expect(achou).toBe(true);
  });
});
