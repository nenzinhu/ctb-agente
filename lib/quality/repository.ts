import { supabaseAdmin } from '@/lib/db/client';
import { isMissingSchemaError, QualityMigrationPendingError } from '@/lib/ingestion/documents';
import type { ColecaoQualidade, DiagnosticoBase } from './types';

export interface EstatisticasDocumentais {
  documentos: number;
  trechos: number;
  trechosSemVetor: number;
  vazios: number;
  curtos: number;
  duplicados: number;
}

function erroDeSchema(error: unknown): never {
  if (isMissingSchemaError(error)) throw new QualityMigrationPendingError();
  throw new Error('Não foi possível acessar os diagnósticos de qualidade.');
}

export async function verificarSchemaQualidade(): Promise<void> {
  const { data, error } = await supabaseAdmin.rpc('quality_schema_version');
  if (error) erroDeSchema(error);
  if (Number(data) !== 11) throw new QualityMigrationPendingError();
}

export async function obterEstatisticasDocumentais(colecao: ColecaoQualidade): Promise<EstatisticasDocumentais> {
  await verificarSchemaQualidade();
  const { data, error } = await supabaseAdmin.rpc('document_quality_stats', { p_colecao: colecao });
  if (error) erroDeSchema(error);
  const linha = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
  return {
    documentos: Number(linha?.documentos ?? 0),
    trechos: Number(linha?.trechos ?? 0),
    trechosSemVetor: Number(linha?.trechos_sem_vetor ?? 0),
    vazios: Number(linha?.vazios ?? 0),
    curtos: Number(linha?.curtos ?? 0),
    duplicados: Number(linha?.duplicados ?? 0),
  };
}

export async function salvarDiagnostico(
  diagnostico: DiagnosticoBase,
  duracaoMs: number,
): Promise<DiagnosticoBase> {
  const { data, error } = await supabaseAdmin
    .from('diagnosticos_base')
    .insert({
      colecao: diagnostico.colecao,
      status: diagnostico.status,
      fontes: diagnostico.fontes,
      metricas: diagnostico.metricas,
      detalhes: diagnostico.detalhes,
      duracao_ms: Math.max(0, Math.round(duracaoMs)),
      executado_em: diagnostico.executadoEm,
    })
    .select('id')
    .single();
  if (error) erroDeSchema(error);
  return { ...diagnostico, id: String((data as { id: unknown }).id) };
}

export async function listarUltimosDiagnosticos(): Promise<DiagnosticoBase[]> {
  await verificarSchemaQualidade();
  const { data, error } = await supabaseAdmin
    .from('diagnosticos_base')
    .select('id, colecao, status, fontes, metricas, detalhes, executado_em')
    .order('executado_em', { ascending: false })
    .limit(30);
  if (error) erroDeSchema(error);

  const vistos = new Set<ColecaoQualidade>();
  const diagnosticos: DiagnosticoBase[] = [];
  for (const registro of (data ?? []) as Array<Record<string, unknown>>) {
    const colecao = registro.colecao as ColecaoQualidade;
    if (vistos.has(colecao)) continue;
    vistos.add(colecao);
    diagnosticos.push({
      id: String(registro.id),
      colecao,
      status: registro.status as DiagnosticoBase['status'],
      fontes: registro.fontes as DiagnosticoBase['fontes'],
      metricas: registro.metricas as DiagnosticoBase['metricas'],
      detalhes: registro.detalhes as DiagnosticoBase['detalhes'],
      executadoEm: String(registro.executado_em),
    });
  }
  return diagnosticos;
}
