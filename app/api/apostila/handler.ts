import { ProviderChain } from '@/lib/ai/providers/chain';
import { buscarFichas, todasAsFichas } from '@/lib/mbft/fichas';
import { buscarPops, todosOsPops } from '@/lib/pop/pops';
import {
  capituloSemIA,
  promptCapitulo,
  tituloItem,
  type Capitulo,
  type FonteApostila,
  type ItemApostila,
  type Publico,
} from '@/lib/rag/apostila';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { getCachedValue, setCachedValue } from '@/lib/response/cache';

const TEMPO_IA_MS = 40_000;

const itemDe = (fonte: FonteApostila, id: string) =>
  fonte === 'mbft' ? todasAsFichas().find((f) => f.codigo === id) : todosOsPops().find((p) => p.numero === id);

/**
 * Official items for a theme, to pick the chapters from
 * @param fonte - MBFT sheets or POPs
 * @param tema - Words, code, article or POP number
 */
export function sugerirItens(fonte: FonteApostila, tema: string): ItemApostila[] {
  return fonte === 'mbft'
    ? buscarFichas(tema, 12).map((f) => ({ id: f.codigo, titulo: tituloItem('mbft', f) }))
    : buscarPops(tema, 12).map((p) => ({ id: p.numero, titulo: tituloItem('pop', p) }));
}

async function escreverCapitulo(chain: ProviderChain, fonte: FonteApostila, id: string, publico: Publico): Promise<Capitulo | null> {
  const item = itemDe(fonte, id);
  if (!item) return null;
  const titulo = tituloItem(fonte, item);

  // v2 discards chapters cached before the mixed-language pt-BR guard.
  const chave = `apostila:v2:${fonte}:${id}:${publico}`;
  const emCache = await getCachedValue<Capitulo>(chave);
  if (emCache) return emCache;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const resultado = await Promise.race([
      // One model per chapter: the chapters already run in parallel
      chain.generateRapido(promptCapitulo(fonte, item, publico), 2200, 0.4, 1),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('tempo esgotado')), TEMPO_IA_MS);
      }),
    ]);
    const capitulo: Capitulo = { id, titulo, texto: resultado.texto.trim(), modelo: `${resultado.provedor} · ${resultado.modelo}` };
    await setCachedValue(chave, capitulo, { pergunta: chave, modelo: capitulo.modelo ?? 'ia', tempoMs: 0 });
    return capitulo;
  } catch (error) {
    console.warn(`Handout chapter ${fonte}:${id} fell back to the official text:`, error);
    return { id, titulo, texto: capituloSemIA(fonte, item), modelo: null };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Write the handout: one chapter per item, in parallel. A chapter the models
 * can't write falls back to the official text, so the handout is never empty.
 */
export async function gerarApostila(
  fonte: FonteApostila,
  ids: string[],
  publico: Publico,
  ip: string
): Promise<{ capitulos: Capitulo[] } | { erro: 'rate_limit_exceeded' | 'ip_blocked' | 'not_found' }> {
  const limite = await checkRateLimit(ip, { tipo: 'apostila', pergunta: `${fonte}:${ids.join(',')}` });
  if (!limite.allowed) return { erro: limite.blocked ? 'ip_blocked' : 'rate_limit_exceeded' };

  const inicio = Date.now();
  const chain = new ProviderChain();
  const capitulos = (await Promise.all(ids.map((id) => escreverCapitulo(chain, fonte, id, publico)))).filter(
    (c): c is Capitulo => c !== null
  );
  if (capitulos.length === 0) return { erro: 'not_found' };

  await recordQuery(
    ip,
    `apostila ${fonte}: ${ids.join(', ')}`,
    { tipo: 'apostila', sucesso: true, tempoMs: Date.now() - inicio, modelo: capitulos.find((c) => c.modelo)?.modelo ?? 'oficial' },
    limite.registroId
  );
  return { capitulos };
}
