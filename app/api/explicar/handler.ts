import { ProviderChain } from '@/lib/ai/providers/chain';
import { todasAsFichas } from '@/lib/mbft/fichas';
import { todosOsPops } from '@/lib/pop/pops';
import { promptExplicarFicha, promptExplicarPop } from '@/lib/rag/explicar';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { getCachedValue, setCachedValue } from '@/lib/response/cache';

export type ExplicarErro = 'not_found' | 'no_ai' | 'ai_failed' | 'rate_limit_exceeded' | 'ip_blocked';

export interface Explicacao {
  texto: string;
  modelo: string;
  cache_hit: boolean;
}

const TEMPO_IA_MS = 25_000;

/**
 * Explain an official MBFT sheet or POP in plain language. Only the id
 * travels from the browser: the text sent to the model is always the
 * official one, read on the server.
 * @param tipo - "ficha" (MBFT code) or "pop" (POP number)
 * @param id - "516-91" or "201.4.6"
 * @param ip - Client IP (rate limit)
 */
export async function explicar(
  tipo: 'ficha' | 'pop',
  id: string,
  ip: string
): Promise<{ explicacao: Explicacao } | { erro: ExplicarErro }> {
  const ficha = tipo === 'ficha' ? todasAsFichas().find((f) => f.codigo === id) : undefined;
  const pop = tipo === 'pop' ? todosOsPops().find((p) => p.numero === id) : undefined;
  if (!ficha && !pop) return { erro: 'not_found' };

  // One explanation per sheet serves every agent: cached before the rate limit
  // v3 discards explanations cached before the mixed-language pt-BR guard.
  const chave = `explicar:v3:${tipo}:${id}`;
  const emCache = await getCachedValue<Explicacao>(chave);
  if (emCache) return { explicacao: { ...emCache, cache_hit: true } };

  const limite = await checkRateLimit(ip, { tipo: 'explicacao', pergunta: chave });
  if (!limite.allowed) return { erro: limite.blocked ? 'ip_blocked' : 'rate_limit_exceeded' };

  const chain = new ProviderChain();
  if (chain.ativos.length === 0) return { erro: 'no_ai' };

  const inicio = Date.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const resultado = await Promise.race([
      chain.generateRapido(ficha ? promptExplicarFicha(ficha) : promptExplicarPop(pop!), 1100, 0.4),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('tempo esgotado')), TEMPO_IA_MS);
      }),
    ]);
    const explicacao: Explicacao = {
      texto: resultado.texto.trim(),
      modelo: `${resultado.provedor} · ${resultado.modelo}`,
      cache_hit: false,
    };
    const tempoMs = Date.now() - inicio;
    await recordQuery(ip, chave, { tipo: 'explicacao', sucesso: true, tempoMs, modelo: explicacao.modelo }, limite.registroId);
    await setCachedValue(chave, explicacao, { pergunta: chave, modelo: explicacao.modelo, tempoMs });
    return { explicacao };
  } catch (error) {
    console.warn('Plain-language explanation failed:', error);
    await recordQuery(ip, chave, { tipo: 'explicacao', sucesso: false, tempoMs: Date.now() - inicio }, limite.registroId);
    return { erro: 'ai_failed' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
