import { supabaseAdmin } from '@/lib/db/client';
import type { DominioConsulta } from './intent-specialist';
import type { ResultadoIntencao } from './intent-feedback';

export interface CorrecaoIntencao {
  dominioEsperado: DominioConsulta;
  resultadosEsperados: ResultadoIntencao[];
  notaCorrecao?: string;
}

export async function listarExemplosIntencao(limite = 100) {
  const { data, error } = await supabaseAdmin
    .from('intencao_consultas')
    .select('id, consulta_anonimizada, dominio_previsto, confianca, fonte_classificacao, modelo_intencao, sinais, resultados, dominio_esperado, resultados_esperados, nota_correcao, revisada, criado_em, revisado_em')
    .order('revisada', { ascending: true })
    .order('criado_em', { ascending: false })
    .limit(Math.min(Math.max(limite, 1), 500));
  if (error) throw error;
  return data ?? [];
}

export async function corrigirExemploIntencao(id: string, correcao: CorrecaoIntencao) {
  const { data, error } = await supabaseAdmin
    .from('intencao_consultas')
    .update({
      dominio_esperado: correcao.dominioEsperado,
      resultados_esperados: correcao.resultadosEsperados,
      nota_correcao: correcao.notaCorrecao?.trim() || null,
      revisada: true,
      revisado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, revisada, dominio_esperado, resultados_esperados, nota_correcao, revisado_em')
    .single();
  if (error) throw error;
  return data;
}
