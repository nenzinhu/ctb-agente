// POP-PMSC consultation: retrieve the most relevant excerpts of the indexed
// POPs and, when an AI provider is configured, write an answer that cites
// them. Without a provider (or when it fails) the excerpts alone are returned.
import { filterPII } from '@/lib/query/pii-filter';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { turnstileEnabled, verifyTurnstile } from '@/lib/ratelimit/turnstile';
import { buscarTrechos } from '@/lib/search/trechos';
import { MigrationPendingError } from '@/lib/ingestion/documents';
import { ProviderChain } from '@/lib/ai/providers/chain';
import { getCachedValue, setCachedValue } from '@/lib/response/cache';
import { buscarPops } from '@/lib/pop/pops';
import { numeroPop } from '@/lib/query/router';
import { ehSemResposta, fontesDosPops, montarPrompt, montarPromptGeral, validarCitacoes, type FontePop, type RespostaPop } from '@/lib/rag/pop';

export type PopErro = 'rate_limit_exceeded' | 'ip_blocked' | 'turnstile_failed' | 'migration_pending' | 'internal_error';

export interface ResultadoPop {
  resposta?: RespostaPop;
  erro?: PopErro;
  mensagem?: string;
}

const LIMITE_FONTES = 6;
// The route has 60s; a slow free model must not take the excerpts down with it.
// Per AI call; the grounded answer and the general fallback each get one.
const TEMPO_IA_MS = 18_000;

function chaveCache(pergunta: string): string {
  // A new ranking must not reuse an answer grounded in the old source list.
  return `pop:v4:${pergunta.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

async function gerarResposta(
  prompt: string
): Promise<{ texto: string; modelo: string } | { erro: string } | null> {
  const chain = new ProviderChain();
  if (chain.ativos.length === 0) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const resultado = await Promise.race([
      chain.generateRapido(prompt, 800, 0.2),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('tempo esgotado')), TEMPO_IA_MS);
      }),
    ]);
    return { texto: resultado.texto, modelo: `${resultado.provedor} · ${resultado.modelo}` };
  } catch (error) {
    console.warn('POP answer generation failed:', error);
    return { erro: error instanceof Error ? error.message : String(error) };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Answer a question about the POP-PMSC base
 * @param pergunta - Question as typed by the agent
 * @param ip - Client IP (rate limit)
 * @param turnstileToken - Anti-bot token, required close to the hourly limit
 */
export async function responderPop(pergunta: string, ip: string, turnstileToken?: string): Promise<ResultadoPop> {
  const inicio = Date.now();
  // Nothing leaves this function unfiltered: not the log, the cache key,
  // the embedding provider or the AI prompt.
  const filtrada = filterPII(pergunta).trim();

  const limite = await checkRateLimit(ip, { tipo: 'pop', pergunta: filtrada });
  if (!limite.allowed) {
    await recordQuery(ip, filtrada, { tipo: 'pop', sucesso: false, tempoMs: 0 }, limite.registroId);
    return { erro: limite.blocked ? 'ip_blocked' : 'rate_limit_exceeded' };
  }

  if (await turnstileEnabled()) {
    const exigir = limite.remaining < 5;
    const verificacao = exigir || turnstileToken ? await verifyTurnstile(turnstileToken, ip) : { ok: true };
    if (!verificacao.ok) {
      await recordQuery(ip, filtrada, { tipo: 'pop', sucesso: false, tempoMs: 0 }, limite.registroId);
      return { erro: 'turnstile_failed' };
    }
  }

  const chave = chaveCache(filtrada);
  const emCache = await getCachedValue<RespostaPop>(chave);
  if (emCache) {
    const resposta = { ...emCache, pops: emCache.pops ?? buscarPops(filtrada), cache_hit: true, tempo_ms: Date.now() - inicio };
    await recordQuery(
      ip,
      filtrada,
      { tipo: 'pop', cacheHit: true, sucesso: !resposta.semResposta, tempoMs: resposta.tempo_ms, modelo: 'cache' },
      limite.registroId
    );
    return { resposta };
  }

  try {
    // The bundled manual first: whole POP sections beat excerpts cut at indexing
    const pops = buscarPops(filtrada);
    const numero = numeroPop(filtrada);
    const encontrados = pops.length > 0 ? [] : await buscarTrechos(filtrada, 'pop', LIMITE_FONTES);
    // OR-based database search may return another procedure for a missing
    // exact number. Only that explicit POP can support an answer here.
    const trechos = numero ? encontrados.filter((t) => numeroPop(t.titulo) === numero) : encontrados;
    const fontes: FontePop[] = pops.length > 0 ? fontesDosPops(pops, 2, filtrada) : trechos.map((t, i) => ({
      n: i + 1,
      documento_id: t.documento_id,
      titulo: t.titulo,
      secao: t.secao,
      pagina: t.pagina,
      texto: t.texto,
    }));

    let resposta: string | null = null;
    let modelo: string | null = null;
    let aviso: string | undefined;
    let semResposta = fontes.length === 0;

    let semIA = false;
    if (fontes.length > 0) {
      const gerada = await gerarResposta(montarPrompt(filtrada, fontes));
      if (gerada === null) {
        semIA = true;
        aviso = 'Nenhum provedor de IA configurado: veja abaixo os trechos mais relevantes dos POPs.';
      } else if ('erro' in gerada) {
        aviso = 'A IA não respondeu agora. Os trechos mais relevantes dos POPs estão abaixo.';
      } else {
        resposta = validarCitacoes(gerada.texto, fontes.length).texto || null;
        modelo = gerada.modelo;
        semResposta = resposta === null || ehSemResposta(resposta);
      }
    }

    // The POPs don't cover it: answer from the models' general knowledge,
    // flagged as such in the UI.
    let geral = false;
    if (semResposta && !semIA && !numero) {
      const gerada = await gerarResposta(montarPromptGeral(filtrada));
      if (gerada && !('erro' in gerada) && gerada.texto.trim()) {
        resposta = validarCitacoes(gerada.texto, 0).texto;
        modelo = gerada.modelo;
        geral = true;
        semResposta = false;
      }
    }

    const final: RespostaPop = {
      pergunta: filtrada,
      resposta,
      semResposta,
      fontes,
      modelo,
      aviso,
      geral,
      pops,
      cache_hit: false,
      tempo_ms: Date.now() - inicio,
    };

    await recordQuery(
      ip,
      filtrada,
      { tipo: 'pop', sucesso: !semResposta, tempoMs: final.tempo_ms, modelo: modelo ?? 'database' },
      limite.registroId
    );
    // Only complete answers are worth keeping: an answer that failed for lack
    // of a model should be retried once the model is back.
    if (resposta && !semResposta) {
      await setCachedValue(chave, final, { pergunta: filtrada, modelo: modelo ?? 'database', tempoMs: final.tempo_ms });
    }
    return { resposta: final };
  } catch (error) {
    if (error instanceof MigrationPendingError) {
      return { erro: 'migration_pending', mensagem: 'A base de POPs ainda não foi criada no banco (migration 008).' };
    }
    console.error('POP consultation failed:', error);
    await recordQuery(ip, filtrada, { tipo: 'pop', sucesso: false, tempoMs: Date.now() - inicio }, limite.registroId);
    return { erro: 'internal_error' };
  }
}
