import { supabase } from './client';
import type { Dispositivo, Enquadramento } from './schema';

export async function getEnquadramentoByCodigo(codigo: string): Promise<Enquadramento | null> {
  const { data, error } = await supabase
    .from('enquadramentos')
    .select('*')
    .eq('codigo_mbft', codigo)
    .single();

  if (error) throw error;
  return data;
}

export async function getDispositivoByNumero(numero: string): Promise<Dispositivo | null> {
  const { data, error } = await supabase
    .from('dispositivos')
    .select('*')
    .eq('numero_dispositivo', numero)
    .single();

  if (error) throw error;
  return data;
}

export async function searchDispositivosByTsvector(query: string, limit = 5) {
  const { data, error } = await supabase.rpc('search_dispositivos_tsvector', {
    query_text: query,
    limit_count: limit,
  });

  if (error) throw error;
  return data;
}
