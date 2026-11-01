import {
  prepararExemploIntencao,
  type EntradaExemploIntencao,
} from './intent-feedback';

export type PersistirExemploIntencao = (linha: Record<string, unknown>) => Promise<string | null>;

async function persistirNoSupabase(linha: Record<string, unknown>): Promise<string | null> {
  const { databaseAdminConfigured, supabaseAdmin } = await import('@/lib/db/client');
  if (!databaseAdminConfigured) return null;
  const { data, error } = await supabaseAdmin
    .from('intencao_consultas')
    .insert(linha)
    .select('id')
    .single();
  if (error) throw error;
  return typeof data?.id === 'string' ? data.id : null;
}

/** Coleta best-effort: uma falha de telemetria nunca impede a resposta RAG. */
export async function registrarExemploIntencao(
  entrada: EntradaExemploIntencao,
  persistir: PersistirExemploIntencao = persistirNoSupabase
): Promise<string | null> {
  const exemplo = prepararExemploIntencao(entrada);
  const linha = {
    consulta_anonimizada: exemplo.consultaAnonimizada,
    hash_consulta: exemplo.hashConsulta,
    dominio_previsto: exemplo.dominioPrevisto,
    confianca: exemplo.confianca,
    fonte_classificacao: exemplo.fonte,
    modelo_intencao: exemplo.modelo,
    sinais: exemplo.sinais,
    resultados: exemplo.resultados,
    revisada: false,
  };

  try {
    return await persistir(linha);
  } catch {
    return null;
  }
}
