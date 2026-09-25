import { databaseConfigured, supabase, supabaseAdmin } from './client';
import type { Dispositivo, Enquadramento } from './schema';
import { expandirSinonimos } from '@/lib/search/sinonimos';

/**
 * Extract the "art. N" token from a free-text legal reference
 * @param referencia - e.g. "art. 181 XVII do CTB", "art. 165-A"
 * @returns Article token such as "art. 181" or "art. 165-a", or null
 */
export function extractArtigo(referencia: string): string | null {
  const match = (referencia || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/art\.?\s*(\d+)(?:-([a-z])(?![a-z]))?/);
  return match ? `art. ${match[1]}${match[2] ? `-${match[2]}` : ''}` : null;
}

/** Escapes LIKE wildcards so a user-typed value matches literally. */
function literalLike(valor: string): string {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/** "art. 165-B" → [165, "b"]; labels without an article number go last. */
function chaveDoArtigo(numero: string): [number, string] {
  const match = numero.toLowerCase().match(/(\d+)(?:-([a-z])(?![a-z]))?/);
  return match ? [Number(match[1]), match[2] ?? ''] : [Number.MAX_SAFE_INTEGER, ''];
}

/**
 * The law's reading order. Rows read from the table carry `ordem`
 * (migration 008): among excerpts of the same article, the one that opens it
 * is the canonical text. Search results and older rows have no order, so the
 * label decides: art. 165 < art. 165-A < art. 165-B < art. 166.
 */
export function porOrdem(a: Dispositivo, b: Dispositivo): number {
  const ordemA = (a as Dispositivo & { ordem?: number | null }).ordem ?? Number.MAX_SAFE_INTEGER;
  const ordemB = (b as Dispositivo & { ordem?: number | null }).ordem ?? Number.MAX_SAFE_INTEGER;
  if (ordemA !== ordemB) return ordemA - ordemB;
  const [numeroA, letraA] = chaveDoArtigo(a.numero_dispositivo);
  const [numeroB, letraB] = chaveDoArtigo(b.numero_dispositivo);
  return (
    numeroA - numeroB ||
    letraA.localeCompare(letraB) ||
    a.numero_dispositivo.length - b.numero_dispositivo.length
  );
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
    // Case-insensitive ("art. 165-a" typed vs "art. 165-A" stored), and a long
    // article may be split in several rows under the same label.
    const { data, error } = await supabase
      .from('dispositivos')
      .select('*')
      .ilike('numero_dispositivo', literalLike(numero.trim()))
      .limit(20);

    if (error || !data || data.length === 0) return null;
    return [...(data as Dispositivo[])].sort(porOrdem)[0];
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
      .ilike('numero_dispositivo', `%${literalLike(artigo)}%`)
      .limit(50);

    if (error || !data || data.length === 0) return null;

    // "art. 16" must not pick "art. 165", nor "art. 165" pick "art. 165-A".
    const candidatos = (data as Dispositivo[]).filter((d) => extractArtigo(d.numero_dispositivo) === artigo);
    if (candidatos.length === 0) return null;

    const normalizado = referencia.toLowerCase().replace(/\bdo ctb\b/g, '');
    const incisos = [...normalizado.matchAll(/\b(?:inciso\s+)?([ivxl]+)\b/g)].map((m) => m[1].toUpperCase());

    const pontuado = candidatos.map((d) => {
      let pontos = 0;
      for (const inciso of incisos) {
        // The label names the inciso an excerpt starts at ("art. 181 XVII");
        // the text tells which incisos it contains ("XVII - em local…").
        if (new RegExp(`\\s${inciso}$`).test(d.numero_dispositivo)) pontos += 10;
        else if (new RegExp(`(^|\\n)${inciso}\\s*[-–—]`).test(d.texto)) pontos += 5;
      }
      return { dispositivo: d, pontos };
    });

    pontuado.sort((a, b) => b.pontos - a.pontos || porOrdem(a.dispositivo, b.dispositivo));
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
      query_text: expandirSinonimos(query),
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
