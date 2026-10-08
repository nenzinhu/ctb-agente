import { ProviderChain } from '@/lib/ai/providers/chain';
import { rerankearComIaSeAmbiguo } from './ai-reranker';
import type { CandidatoReordenado } from './reranker';

const TEMPO_RERANK_MS = 3_000;

/** Reranking opcional: sem provedor, erro ou timeout, preserva exatamente a ordem local. */
export async function rerankearComProvedores<T extends CandidatoReordenado>(consulta: string, candidatos: T[]): Promise<T[]> {
  const chain = new ProviderChain();
  if (chain.ativos.length === 0) return candidatos;

  const gerar = async (prompt: string): Promise<string> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        chain.generateRapido(prompt, 180, 0),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('reranking excedeu o tempo limite')), TEMPO_RERANK_MS);
        }),
      ]).then((resultado) => resultado.texto);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  return (await rerankearComIaSeAmbiguo(consulta, candidatos, gerar)).candidatos;
}
