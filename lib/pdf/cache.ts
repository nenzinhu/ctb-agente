// PDF cache: a dossiê only changes when the corpus or the requested sections change.
import { databaseConfigured, supabase, supabaseAdmin } from '@/lib/db/client';
import { getCounters } from '@/lib/db/queries';

export { buildPdfCacheKey } from './themes';

const TTL_DIAS = 7;

/**
 * Version of the current corpus, used to invalidate the cache when the base changes
 * @returns Version string
 */
export async function getCorpusVersion(): Promise<string> {
  const { documentos, enquadramentos } = await getCounters();
  return `d${documentos}-e${enquadramentos}`;
}

/**
 * Read a cached dossiê
 * @param key - Cache key
 * @returns PDF bytes or null when missing/expired
 */
export async function getCachedPdf(key: string): Promise<Buffer | null> {
  if (!databaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('cache_respostas')
      .select('resposta_completa, ttl_dias, data_ultimo_acesso')
      .eq('hash_pergunta', key)
      .maybeSingle();

    if (error || !data) return null;

    const ttlDias = Number(data.ttl_dias ?? TTL_DIAS);
    const idadeDias =
      (Date.now() - new Date(data.data_ultimo_acesso as string).getTime()) / 86_400_000;
    if (idadeDias > ttlDias) return null;

    const payload = data.resposta_completa as { pdf_base64?: string } | null;
    if (!payload?.pdf_base64) return null;

    return Buffer.from(payload.pdf_base64, 'base64');
  } catch (error) {
    console.warn('PDF cache lookup failed:', error);
    return null;
  }
}

/**
 * Store a rendered dossiê in the cache
 * @param key - Cache key
 * @param pdf - Rendered PDF
 * @param tema - Theme label, kept for the admin panel
 */
export async function setCachedPdf(key: string, pdf: Buffer, tema: string): Promise<void> {
  if (!databaseConfigured) return;
  try {
    const { error } = await supabaseAdmin.from('cache_respostas').upsert(
      {
        hash_pergunta: key,
        pergunta_original: `dossiê: ${tema}`,
        resposta_completa: { pdf_base64: pdf.toString('base64') },
        modelo_usado: 'pdf-renderer',
        tempo_geracao_ms: 0,
        citacoes_validadas: true,
        data_ultimo_acesso: new Date().toISOString(),
        ttl_dias: TTL_DIAS,
      },
      { onConflict: 'hash_pergunta' }
    );

    if (error) {
      console.warn('Failed to cache PDF:', error.message);
    }
  } catch (error) {
    console.warn('PDF cache write failed:', error);
  }
}
