// Response cache backed by the `cache_respostas` table.
// Consultations are deterministic for a given corpus, so caching them keeps
// the LLM quota for genuinely new questions.
import crypto from 'crypto';
import { databaseConfigured, supabase, supabaseAdmin } from '@/lib/db/client';
import type { CartaoEstruturado } from './response-types';

const DEFAULT_TTL_DIAS = 30;

// Keep responses ranked by the previous lexical search out of the new cache.
const chaveCartao = (consulta: string) => `consulta:v5:${consulta.trim()}`;

/**
 * Stable hash used as cache key
 * @param consulta - Raw user query
 * @returns Hex digest
 */
export function hashPergunta(consulta: string): string {
  return crypto
    .createHash('sha256')
    .update(consulta.trim().toLowerCase().replace(/\s+/g, ' '))
    .digest('hex');
}

/**
 * Generic cached JSON (e.g. POP-PMSC answers), in the same table and with
 * the same invalidation as the cards. Namespace the key ("pop:…") so it can
 * never collide with a CTB consultation.
 * @param chave - Namespaced, PII-filtered key
 * @returns The stored value, or null when missing/expired
 */
export async function getCachedValue<T>(chave: string): Promise<T | null> {
  if (!databaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('cache_respostas')
      .select('resposta_completa, ttl_dias, data_ultimo_acesso')
      .eq('hash_pergunta', hashPergunta(chave))
      .maybeSingle();
    if (error || !data) return null;

    const idadeDias = (Date.now() - new Date(data.data_ultimo_acesso as string).getTime()) / 86_400_000;
    if (idadeDias > Number(data.ttl_dias ?? DEFAULT_TTL_DIAS)) return null;
    return (data.resposta_completa as T) ?? null;
  } catch (error) {
    console.warn('Cache lookup failed:', error);
    return null;
  }
}

/**
 * Stores a generic cached JSON value (best-effort).
 */
export async function setCachedValue(
  chave: string,
  valor: unknown,
  meta: { pergunta: string; modelo: string; tempoMs: number }
): Promise<void> {
  if (!databaseConfigured) return;
  try {
    const { error } = await supabaseAdmin.from('cache_respostas').upsert(
      {
        hash_pergunta: hashPergunta(chave),
        pergunta_original: meta.pergunta,
        resposta_completa: valor,
        modelo_usado: meta.modelo,
        tempo_geracao_ms: meta.tempoMs,
        citacoes_validadas: true,
        data_ultimo_acesso: new Date().toISOString(),
        ttl_dias: DEFAULT_TTL_DIAS,
      },
      { onConflict: 'hash_pergunta' }
    );
    if (error) console.warn('Failed to cache value:', error.message);
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
}

/**
 * Look up a cached card for a query
 * @param consulta - Raw user query
 * @returns Cached card or null when missing/expired
 */
export async function getCachedCard(consulta: string): Promise<CartaoEstruturado | null> {
  if (!databaseConfigured) return null;
  try {
    const hash = hashPergunta(chaveCartao(consulta));
    const { data, error } = await supabase
      .from('cache_respostas')
      .select('resposta_completa, ttl_dias, data_ultimo_acesso, citacoes_validadas')
      .eq('hash_pergunta', hash)
      .maybeSingle();

    if (error || !data) return null;

    const ttlDias = Number(data.ttl_dias ?? DEFAULT_TTL_DIAS);
    const idadeDias =
      (Date.now() - new Date(data.data_ultimo_acesso as string).getTime()) / 86_400_000;
    if (idadeDias > ttlDias) return null;

    // Touch the entry so the TTL measures inactivity
    void supabaseAdmin
      .from('cache_respostas')
      .update({ data_ultimo_acesso: new Date().toISOString() })
      .eq('hash_pergunta', hash);

    const card = data.resposta_completa as unknown as CartaoEstruturado;
    if (!card || typeof card !== 'object') return null;

    return { ...card, cache_hit: true, citacoes: card.citacoes ?? [] };
  } catch (error) {
    console.warn('Cache lookup failed:', error);
    return null;
  }
}

/**
 * Store a card in the cache
 * @param consulta - Raw user query
 * @param card - Card to store
 * @param modelo - Which model/strategy produced the answer
 */
export async function setCachedCard(
  consulta: string,
  card: CartaoEstruturado,
  modelo = 'database'
): Promise<void> {
  if (!card.sucesso || !databaseConfigured) return;

  try {
    const { error } = await supabaseAdmin.from('cache_respostas').upsert(
      {
        hash_pergunta: hashPergunta(chaveCartao(consulta)),
        pergunta_original: consulta,
        resposta_completa: card,
        modelo_usado: modelo,
        tempo_geracao_ms: card.tempo_ms,
        citacoes_validadas: card.citacoes.every((c) => c.validada),
        data_ultimo_acesso: new Date().toISOString(),
        ttl_dias: DEFAULT_TTL_DIAS,
      },
      { onConflict: 'hash_pergunta' }
    );

    if (error) {
      console.warn('Failed to cache response:', error.message);
    }
  } catch (error) {
    console.warn('Cache write failed:', error);
  }
}

export interface CacheStats {
  total: number;
  validas: number;
  expiradas: number;
  ultimoAcesso: string | null;
}

/**
 * Aggregate cache statistics for the admin panel
 * @returns Cache counters
 */
export async function getCacheStats(): Promise<CacheStats> {
  if (!databaseConfigured) {
    return { total: 0, validas: 0, expiradas: 0, ultimoAcesso: null };
  }

  try {
    const { data, error } = await supabase
      .from('cache_respostas')
      .select('ttl_dias, data_ultimo_acesso')
      .limit(5000);

    if (error || !data) {
      return { total: 0, validas: 0, expiradas: 0, ultimoAcesso: null };
    }

    const agora = Date.now();
    let validas = 0;
    let ultimoAcesso: string | null = null;

    for (const row of data) {
      const acesso = new Date(row.data_ultimo_acesso as string).getTime();
      const ttl = Number(row.ttl_dias ?? DEFAULT_TTL_DIAS) * 86_400_000;
      if (agora - acesso <= ttl) validas += 1;
      if (!ultimoAcesso || acesso > new Date(ultimoAcesso).getTime()) {
        ultimoAcesso = new Date(acesso).toISOString();
      }
    }

    return { total: data.length, validas, expiradas: data.length - validas, ultimoAcesso };
  } catch {
    return { total: 0, validas: 0, expiradas: 0, ultimoAcesso: null };
  }
}

/**
 * Delete expired cache entries, honoring each row's own ttl_dias.
 * Uses the purge_expired_cache() RPC (migration 007); falls back to a plain
 * delete with the default TTL when the RPC is not applied yet.
 * @returns Number of removed entries (0 when the RPC errors)
 */
export async function clearExpiredCache(): Promise<number> {
  if (!databaseConfigured) return 0;

  try {
    const { data, error } = await supabaseAdmin.rpc('purge_expired_cache');
    if (!error) {
      const removidos = Array.isArray(data) ? Number(data[0]) : Number(data);
      return Number.isFinite(removidos) ? removidos : 0;
    }

    if (!isMissingRpcError(error)) {
      console.warn('Cache purge failed:', error.message);
      return 0;
    }
  } catch (error) {
    const mensagem = error instanceof Error ? error.message : String(error);
    if (!/could not find the function|does not exist|schema cache/i.test(mensagem)) {
      console.warn('Cache purge failed:', mensagem);
      return 0;
    }
  }

  // Legacy fallback: assumes DEFAULT_TTL_DIAS for every row.
  const limite = new Date(Date.now() - DEFAULT_TTL_DIAS * 86_400_000).toISOString();
  const { error: erroDelete } = await supabaseAdmin
    .from('cache_respostas')
    .delete()
    .lt('data_ultimo_acesso', limite);

  return erroDelete ? 0 : -1;
}

/**
 * Drop every cached response. Called right after the corpus changes
 * (document ingestion, enquadramento CRUD) so agents never see a stale
 * card for up to 30 days after the fix. Best-effort: failures are logged,
 * never propagated.
 * @returns Number of removed entries, -1 on failure
 */
export async function invalidateResponseCache(): Promise<number> {
  if (!databaseConfigured) return -1;

  try {
    const { data, error } = await supabaseAdmin.rpc('bump_corpus_version');
    if (!error) {
      const removidos = Array.isArray(data) ? Number(data[0]) : Number(data);
      return Number.isFinite(removidos) ? removidos : -1;
    }
    console.warn('Cache invalidation failed:', error.message);
  } catch (error) {
    console.warn('Cache invalidation failed:', error);
  }
  return -1;
}

/**
 * Detect the Supabase error raised when the RPC is absent (migration pending)
 * @param error - Error returned by the rpc() call
 * @returns True when the function does not exist in the database
 */
function isMissingRpcError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'PGRST202' || code === '42883') return true;
  return /could not find the function|does not exist|schema cache/i.test(
    error instanceof Error ? error.message : String(error ?? '')
  );
}
