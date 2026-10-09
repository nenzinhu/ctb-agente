/** @jest-environment node */

import { executarCasos } from '@/lib/quality/benchmark';
import type { CasoBusca } from '@/lib/quality/cases';

const caso = (id: string, esperado: string, maxPosicao: 1 | 3 = 3, comparacao: 'exata' | 'prefixo' = 'exata'): CasoBusca => ({
  id,
  colecao: 'ctb',
  consulta: id,
  categoria: 'frase',
  esperados: [esperado],
  comparacao,
  maxPosicao,
});

describe('benchmark de recuperação', () => {
  it('mede posição, Hit@1, Hit@3 e latência', async () => {
    const tempos = [0, 100, 100, 300, 300, 600];
    const metricas = await executarCasos(
      [caso('primeiro', 'art. 165'), caso('terceiro', 'art. 167'), caso('ausente', 'art. 181')],
      async (entrada) => entrada.id === 'primeiro'
        ? ['art. 165']
        : entrada.id === 'terceiro'
          ? ['art. 1', 'art. 2', 'art. 167']
          : [],
      { now: () => tempos.shift() ?? 600 },
    );

    expect(metricas).toMatchObject({ total: 3, hit1: 33.33, hit3: 66.67, tempoMedioMs: 200, piorTempoMs: 300 });
    expect(metricas.casos.map((resultado) => resultado.posicao)).toEqual([1, 3, null]);
  });

  it('aceita comparação por prefixo', async () => {
    const metricas = await executarCasos(
      [caso('prefixo', 'art. 181', 1, 'prefixo')],
      async () => ['art. 181, VIII'],
    );
    expect(metricas.casos[0]).toMatchObject({ posicao: 1, passou: true });
  });

  it('registra exceção e timeout sem interromper os outros casos', async () => {
    const metricas = await executarCasos(
      [caso('erro', 'x'), caso('lento', 'y'), caso('ok', 'z')],
      async (entrada) => {
        if (entrada.id === 'erro') throw new Error('banco indisponível');
        if (entrada.id === 'lento') return new Promise<string[]>(() => undefined);
        return ['z'];
      },
      { timeoutMs: 5 },
    );
    expect(metricas.casos).toHaveLength(3);
    expect(metricas.casos[0]).toMatchObject({ passou: false, erro: 'banco indisponível' });
    expect(metricas.casos[1]).toMatchObject({ passou: false, erro: expect.stringMatching(/tempo limite/i) });
    expect(metricas.casos[2]).toMatchObject({ passou: true, posicao: 1 });
  });
});
