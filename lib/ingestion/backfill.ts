// Generates the embeddings that excerpts were inserted without (provider
// down, rate limited, no MISTRAL_API_KEY yet, or the upload ran out of time).
// Time-boxed: the panel calls it repeatedly until nothing is left.
import { embeddingChain } from '@/lib/ai/embeddings';
import { getEmbeddingConfig } from '@/lib/ai/embedding-config';
import type { EmbeddingConfig } from '@/lib/ai/embedding-models';
import { supabaseAdmin } from '@/lib/db/client';
import { embeddingInput } from './processor';
import { isMissingSchemaError } from './documents';

const BATCH = 32;
const UPDATE_CONCURRENCY = 8;

export interface BackfillResult {
  atualizados: number;
  restantes: number;
  erro?: string;
}

interface Pendente {
  id: string;
  tabela: 'dispositivos' | 'documento_trechos';
  documentoId: string | null;
  texto: string;
}

async function pendentesDispositivos(config: EmbeddingConfig): Promise<Pendente[]> {
  const { data, error } = await supabaseAdmin
    .from('dispositivos')
    .select('id, numero_dispositivo, texto, norma_id, documento_id')
    .is(config.coluna, null)
    .limit(BATCH);
  if (error) {
    if (config.coluna === 'embedding_nemotron' && isMissingSchemaError(error)) throw new Error('Aplique scripts/migrations-015-nemotron-embeddings.sql para gerar os vetores Nemotron.');
    // Before migration 008 there is no documento_id column: retry without it.
    if (!isMissingSchemaError(error)) throw new Error(error.message);
    const retry = await supabaseAdmin
      .from('dispositivos')
      .select('id, numero_dispositivo, texto, norma_id')
      .is(config.coluna, null)
      .limit(BATCH);
    if (retry.error) throw new Error(retry.error.message);
    return (retry.data ?? []).map((row) => ({
      id: row.id as string,
      tabela: 'dispositivos',
      documentoId: null,
      texto: embeddingInput(row.texto as string, [row.norma_id as string, row.numero_dispositivo as string]),
    }));
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    tabela: 'dispositivos',
    documentoId: (row.documento_id as string | null) ?? null,
    texto: embeddingInput(row.texto as string, [row.norma_id as string, row.numero_dispositivo as string]),
  }));
}

async function pendentesTrechos(config: EmbeddingConfig): Promise<Pendente[]> {
  const { data, error } = await supabaseAdmin
    .from('documento_trechos')
    .select('id, documento_id, secao, texto, documentos(titulo)')
    .is(config.coluna, null)
    .limit(BATCH);
  if (error) {
    if (config.coluna === 'embedding_nemotron' && isMissingSchemaError(error)) throw new Error('Aplique scripts/migrations-015-nemotron-embeddings.sql para gerar os vetores Nemotron.');
    if (isMissingSchemaError(error)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => {
    const documento = row.documentos as { titulo?: string } | { titulo?: string }[] | null;
    const titulo = Array.isArray(documento) ? documento[0]?.titulo : documento?.titulo;
    return {
      id: row.id as string,
      tabela: 'documento_trechos',
      documentoId: row.documento_id as string,
      texto: embeddingInput(row.texto as string, [titulo, row.secao as string | null]),
    };
  });
}

/**
 * @returns How many excerpts still have no embedding, in both tables
 */
export async function countPendingEmbeddings(selected?: EmbeddingConfig): Promise<number> {
  const config = selected ?? await getEmbeddingConfig();
  const contar = async (tabela: string) => {
    const { count, error } = await supabaseAdmin
      .from(tabela)
      .select('id', { count: 'exact', head: true })
      .is(config.coluna, null);
    if (error) {
      if (config.coluna === 'embedding_nemotron' && isMissingSchemaError(error)) throw new Error('Aplique scripts/migrations-015-nemotron-embeddings.sql para gerar os vetores Nemotron.');
      if (isMissingSchemaError(error)) return 0;
      throw new Error(error.message);
    }
    return count ?? 0;
  };
  const [dispositivos, trechos] = await Promise.all([contar('dispositivos'), contar('documento_trechos')]);
  return dispositivos + trechos;
}

async function atualizarContagens(documentoIds: Set<string>, config: EmbeddingConfig): Promise<void> {
  for (const id of documentoIds) {
    const [ctb, pop] = await Promise.all(
      ['dispositivos', 'documento_trechos'].map((tabela) =>
        supabaseAdmin
          .from(tabela)
          .select('id', { count: 'exact', head: true })
          .eq('documento_id', id)
          .is(config.coluna, null)
      )
    );
    const semVetor = (ctb.count ?? 0) + (pop.count ?? 0);
    await supabaseAdmin
      .from('documentos')
      .update({ trechos_sem_vetor: semVetor, atualizado_em: new Date().toISOString() })
      .eq('id', id);
  }
}

/**
 * Embeds pending excerpts until none are left or the deadline passes.
 * @param deadline - Epoch ms after which no new batch is started
 */
export async function backfillEmbeddings(deadline: number): Promise<BackfillResult> {
  const config = await getEmbeddingConfig();
  let atualizados = 0;
  const tocados = new Set<string>();

  try {
    while (Date.now() < deadline) {
      let lote = await pendentesDispositivos(config);
      if (lote.length === 0) lote = await pendentesTrechos(config);
      if (lote.length === 0) break;

      let vetores: number[][];
      try {
        vetores = await embeddingChain.embedBatch(lote.map((p) => p.texto), config.id);
      } catch (error) {
        return {
          atualizados,
          restantes: await countPendingEmbeddings(config),
          erro: error instanceof Error ? error.message : String(error),
        };
      }

      for (let i = 0; i < lote.length; i += UPDATE_CONCURRENCY) {
        await Promise.all(
          lote.slice(i, i + UPDATE_CONCURRENCY).map(async (pendente, j) => {
            const { error } = await supabaseAdmin
              .from(pendente.tabela)
              .update({ [config.coluna]: vetores[i + j] })
              .eq('id', pendente.id);
            if (error) throw new Error(error.message);
            atualizados++;
            if (pendente.documentoId) tocados.add(pendente.documentoId);
          })
        );
      }
    }
  } finally {
    await atualizarContagens(tocados, config).catch((error) => console.error('Falha ao atualizar as contagens:', error));
  }

  return { atualizados, restantes: await countPendingEmbeddings(config) };
}
