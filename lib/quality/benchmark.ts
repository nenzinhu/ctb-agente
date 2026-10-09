import type { CasoBusca } from './cases';
import type { MetricasBusca, ResultadoCasoBusca } from './types';

const DEFAULT_TIMEOUT_MS = 1500;

function normalizar(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

function corresponde(valor: string, esperado: string, comparacao: CasoBusca['comparacao']): boolean {
  const atual = normalizar(valor);
  const referencia = normalizar(esperado);
  return comparacao === 'exata' ? atual === referencia : atual.startsWith(referencia);
}

async function comTempoLimite<T>(operacao: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operacao,
      new Promise<never>((_, rejeitar) => {
        timer = setTimeout(() => rejeitar(new Error(`Tempo limite de ${timeoutMs} ms excedido.`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function percentual(valor: number, total: number): number {
  return total === 0 ? 0 : Number(((valor / total) * 100).toFixed(2));
}

export async function executarCasos(
  casos: CasoBusca[],
  buscar: (caso: CasoBusca) => Promise<string[]>,
  options: { timeoutMs?: number; now?: () => number } = {},
): Promise<MetricasBusca> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const now = options.now ?? Date.now;
  const resultados: ResultadoCasoBusca[] = [];

  for (const caso of casos) {
    const inicio = now();
    try {
      const encontrados = await comTempoLimite(buscar(caso), timeoutMs);
      const indice = encontrados.findIndex((valor) =>
        caso.esperados.some((esperado) => corresponde(valor, esperado, caso.comparacao))
      );
      const posicao = indice < 0 ? null : indice + 1;
      resultados.push({
        casoId: caso.id,
        posicao,
        duracaoMs: Math.max(0, now() - inicio),
        passou: posicao !== null && posicao <= caso.maxPosicao,
      });
    } catch (error) {
      resultados.push({
        casoId: caso.id,
        posicao: null,
        duracaoMs: Math.max(0, now() - inicio),
        passou: false,
        erro: error instanceof Error ? error.message : 'Falha desconhecida na busca.',
      });
    }
  }

  const total = resultados.length;
  const duracoes = resultados.map((resultado) => resultado.duracaoMs);
  return {
    total,
    hit1: percentual(resultados.filter((resultado) => resultado.posicao === 1).length, total),
    hit3: percentual(resultados.filter((resultado) => resultado.posicao !== null && resultado.posicao <= 3).length, total),
    tempoMedioMs: total === 0 ? 0 : Number((duracoes.reduce((soma, valor) => soma + valor, 0) / total).toFixed(2)),
    piorTempoMs: duracoes.length === 0 ? 0 : Math.max(...duracoes),
    casos: resultados,
  };
}
