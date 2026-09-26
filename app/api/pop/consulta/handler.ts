// POP-PMSC consultation: retrieve the most relevant excerpts of the indexed
// POPs and, when an AI provider is configured and the agent wants it, have
// the AI organize them into an answer that cites them. Without AI (turned
// off, not configured or failing) the excerpts alone are returned.
import { filterPII } from '@/lib/query/pii-filter';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { turnstileEnabled, verifyTurnstile } from '@/lib/ratelimit/turnstile';
import { buscarTrechos } from '@/lib/search/trechos';
import { MigrationPendingError } from '@/lib/ingestion/documents';
import { ProviderChain } from '@/lib/ai/providers/chain';
import { getCachedValue, setCachedValue } from '@/lib/response/cache';
import { ehSemResposta, montarPrompt, validarCitacoes, type FontePop, type RespostaPop } from '@/lib/rag/pop';

export type PopErro = 'rate_limit_exceeded' | 'ip_blocked' | 'turnstile_failed' | 'migration_pending' | 'internal_error';

export interface ResultadoPop {
  resposta?: RespostaPop;
  erro?: PopErro;
  mensagem?: string;
}

const LIMITE_FONTES = 6;
// The route has 60s; a slow free model must not take the excerpts down with it.
const TEMPO_IA_MS = 30_000;

function chaveCache(pergunta: string): string {
  return `pop:${pergunta.toLowerCase().replace(/\s+/g, ' ').trim()}`;
}

async function gerarResposta(
  pergunta: string,
  fontes: FontePop[]
): Promise<{ texto: string; modelo: string } | { erro: string } | null> {
  const chain = new ProviderChain();
  if (chain.ativos.length === 0) return null;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const resultado = await Promise.race([
      // Room for the four organized sections (resumo, passos, atenção, base legal).
      chain.generateDetailed(montarPrompt(pergunta, fontes), 1100, 0.2),
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

export interface OpcoesPop {
  /** Have the AI organize an answer from the excerpts (default). Off: excerpts only, faster. */
  ia?: boolean;
}

/**
 * Answer a question about the POP-PMSC base
 * @param pergunta - Question as typed by the agent
 * @param ip - Client IP (rate limit)
 * @param turnstileToken - Anti-bot token, required close to the hourly limit
 * @param opcoes - Whether to write an AI answer or return the excerpts alone
 */
export async function responderPop(
  pergunta: string,
  ip: string,
  turnstileToken?: string,
  opcoes: OpcoesPop = {}
): Promise<ResultadoPop> {
  const comIa = opcoes.ia !== false;
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
  // The cache only holds AI answers; without AI the excerpts come straight from the search.
  const emCache = comIa ? await getCachedValue<RespostaPop>(chave) : null;
  if (emCache) {
    const resposta = { ...emCache, cache_hit: true, tempo_ms: Date.now() - inicio };
    await recordQuery(
      ip,
      filtrada,
      { tipo: 'pop', cacheHit: true, sucesso: !resposta.semResposta, tempoMs: resposta.tempo_ms, modelo: 'cache' },
      limite.registroId
    );
    return { resposta };
  }

  try {
    const trechos = await buscarTrechos(filtrada, 'pop', LIMITE_FONTES);
    const fontes: FontePop[] = trechos.map((t, i) => ({
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

    if (fontes.length > 0 && comIa) {
      const gerada = await gerarResposta(filtrada, fontes);
      if (gerada === null) {
        aviso = 'Nenhum provedor de IA configurado: veja abaixo os trechos mais relevantes dos POPs.';
      } else if ('erro' in gerada) {
        aviso = 'A IA não respondeu agora. Os trechos mais relevantes dos POPs estão abaixo.';
      } else {
        resposta = validarCitacoes(gerada.texto, fontes.length).texto || null;
        modelo = gerada.modelo;
        semResposta = resposta === null || ehSemResposta(resposta);
      }
    }

    const final: RespostaPop = {
      pergunta: filtrada,
      resposta,
      semResposta,
      fontes,
      modelo,
      aviso,
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
