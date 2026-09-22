// Response cache backed by the `cache_respostas` table.
// Consultations are deterministic for a given corpus, so caching them keeps
// the LLM quota for genuinely new questions.
import crypto from 'crypto';
import { databaseConfigured, supabase, supabaseAdmin } from '@/lib/db/client';
import type { CartaoEstruturado } from './response-types';

const DEFAULT_TTL_DIAS = 30;

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
 * Look up a cached card for a query
 * @param consulta - Raw user query
 * @returns Cached card or null when missing/expired
 */
export async function getCachedCard(consulta: string): Promise<CartaoEstruturado | null> {
  if (!databaseConfigured) return null;
  try {
    const hash = hashPergunta(consulta);
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
        hash_pergunta: hashPergunta(consulta),
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
 * Delete expired cache entries
 * @returns Number of removed entries
 */
export async function clearExpiredCache(): Promise<number> {
  const stats = await getCacheStats();
  if (stats.expiradas === 0) return 0;

  const limite = new Date(Date.now() - DEFAULT_TTL_DIAS * 86_400_000).toISOString();
  const { error } = await supabaseAdmin
    .from('cache_respostas')
    .delete()
    .lt('data_ultimo_acesso', limite);

  return error ? 0 : stats.expiradas;
}
