import { databaseConfigured, supabase, supabaseAdmin } from './client';
import type { Dispositivo, Enquadramento } from './schema';

/**
 * Extract the "art. N" token from a free-text legal reference
 * @param referencia - e.g. "art. 181 XVII do CTB"
 * @returns Article token such as "art. 181", or null
 */
export function extractArtigo(referencia: string): string | null {
  const match = (referencia || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/art\.?\s*\d+/);
  return match ? match[0].replace(/\s+/g, ' ').replace(/art\.?\s*/, 'art. ') : null;
}

/**
 * Read one enquadramento by MBFT code
 * @param codigo - MBFT code, e.g. "516-91"
 * @returns Enquadramento or null
 */
export async function getEnquadramentoByCodigo(codigo: string): Promise<Enquadramento | null> {
  if (!databaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('enquadramentos')
      .select('*')
      .eq('codigo_mbft', codigo)
      .maybeSingle();

    if (error || !data) return null;
    return data as Enquadramento;
  } catch (error) {
    console.error('getEnquadramentoByCodigo failed:', error);
    return null;
  }
}

/**
 * Read one dispositivo by its exact number
 * @param numero - e.g. "art. 165"
 * @returns Dispositivo or null
 */
export async function getDispositivoByNumero(numero: string): Promise<Dispositivo | null> {
  if (!databaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('dispositivos')
      .select('*')
      .eq('numero_dispositivo', numero)
      .maybeSingle();

    if (error || !data) return null;
    return data as Dispositivo;
  } catch (error) {
    console.error('getDispositivoByNumero failed:', error);
    return null;
  }
}

/**
 * Find the most specific dispositivo matching a legal reference.
 * Tries the exact reference first ("art. 181 XVII"), then the bare article.
 * @param referencia - Free-text reference, e.g. "art. 181, inciso XVII do CTB"
 * @returns Best matching dispositivo, or null
 */
export async function findDispositivoByReferencia(
  referencia: string
): Promise<Dispositivo | null> {
  if (!databaseConfigured) return null;

  const artigo = extractArtigo(referencia);
  if (!artigo) return null;

  try {
    const { data, error } = await supabase
      .from('dispositivos')
      .select('*')
      .ilike('numero_dispositivo', `%${artigo}%`)
      .limit(50);

    if (error || !data || data.length === 0) return null;

    const normalizado = referencia.toLowerCase();
    const incisos = [...normalizado.matchAll(/\b(inciso\s+)?([ivxl]+)\b/g)].map((m) => m[2]);

    const pontuado = (data as Dispositivo[]).map((d) => {
      const numero = d.numero_dispositivo.toLowerCase();
      let pontos = 0;
      if (numero.includes(artigo)) pontos += 10;
      for (const inciso of incisos) {
        if (numero.includes(inciso)) pontos += 5;
      }
      // Prefer the most specific row when nothing else distinguishes them
      pontos += Math.min(numero.length, 60) / 100;
      return { dispositivo: d, pontos };
    });

    pontuado.sort((a, b) => b.pontos - a.pontos);
    return pontuado[0]?.dispositivo ?? null;
  } catch (error) {
    console.error('findDispositivoByReferencia failed:', error);
    return null;
  }
}

/**
 * Full-text search over dispositivos using the Portuguese tsvector
 * @param query - Normalized query
 * @param limit - Max rows
 * @returns Dispositivos, empty when the RPC is unavailable
 */
export async function searchDispositivos(query: string, limit = 5): Promise<Dispositivo[]> {
  if (!databaseConfigured) return [];
  try {
    const { data, error } = await supabase.rpc('search_dispositivos_tsvector', {
      query_text: query,
      limit_count: limit,
    });

    if (error || !data) return [];
    return data as Dispositivo[];
  } catch (error) {
    console.warn('searchDispositivos failed:', error);
    return [];
  }
}

/**
 * List enquadramentos for the admin panel
 * @param limit - Max rows
 * @returns Enquadramentos ordered by code
 */
export async function listEnquadramentos(limit = 500): Promise<Enquadramento[]> {
  if (!databaseConfigured) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('enquadramentos')
      .select('*')
      .order('codigo_mbft', { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data as Enquadramento[];
  } catch (error) {
    console.error('listEnquadramentos failed:', error);
    return [];
  }
}

/**
 * Create or update an enquadramento
 * @param enquadramento - Fields to persist (must contain codigo_mbft)
 * @returns The stored row
 */
export async function upsertEnquadramento(
  enquadramento: Partial<Enquadramento> & { codigo_mbft: string }
): Promise<Enquadramento> {
  if (!databaseConfigured) {
    throw new Error('Banco de dados não configurado.');
  }

  const { data, error } = await supabaseAdmin
    .from('enquadramentos')
    .upsert(enquadramento, { onConflict: 'codigo_mbft' })
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as Enquadramento;
}

/**
 * Delete an enquadramento by MBFT code
 * @param codigo - MBFT code
 */
export async function deleteEnquadramento(codigo: string): Promise<void> {
  if (!databaseConfigured) {
    throw new Error('Banco de dados não configurado.');
  }

  const { error } = await supabaseAdmin
    .from('enquadramentos')
    .delete()
    .eq('codigo_mbft', codigo);

  if (error) throw new Error(error.message);
}

/**
 * Count documents and enquadramentos for dashboard tiles
 * @returns Counters, zeros when the database is unreachable
 */
export async function getCounters(): Promise<{ documentos: number; enquadramentos: number }> {
  if (!databaseConfigured) return { documentos: 0, enquadramentos: 0 };
  try {
    const [documentos, enquadramentos] = await Promise.all([
      supabase.from('dispositivos').select('*', { count: 'exact', head: true }),
      supabase.from('enquadramentos').select('*', { count: 'exact', head: true }),
    ]);

    return {
      documentos: documentos.count ?? 0,
      enquadramentos: enquadramentos.count ?? 0,
    };
  } catch {
    return { documentos: 0, enquadramentos: 0 };
  }
}
