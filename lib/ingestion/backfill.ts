// Generates the embeddings that excerpts were inserted without (provider
// down, rate limited, no MISTRAL_API_KEY yet, or the upload ran out of time).
// Time-boxed: the panel calls it repeatedly until nothing is left.
import { embeddingChain } from '@/lib/ai/embeddings';
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

async function pendentesDispositivos(): Promise<Pendente[]> {
  const { data, error } = await supabaseAdmin
    .from('dispositivos')
    .select('id, numero_dispositivo, texto, norma_id, documento_id')
    .is('embedding', null)
    .limit(BATCH);
  if (error) {
    // Before migration 008 there is no documento_id column: retry without it.
    if (!isMissingSchemaError(error)) throw new Error(error.message);
    const retry = await supabaseAdmin
      .from('dispositivos')
      .select('id, numero_dispositivo, texto, norma_id')
      .is('embedding', null)
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

async function pendentesTrechos(): Promise<Pendente[]> {
  const { data, error } = await supabaseAdmin
    .from('documento_trechos')
    .select('id, documento_id, secao, texto, documentos(titulo)')
    .is('embedding', null)
    .limit(BATCH);
  if (error) {
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
export async function countPendingEmbeddings(): Promise<number> {
  const contar = async (tabela: string) => {
    const { count, error } = await supabaseAdmin
      .from(tabela)
      .select('id', { count: 'exact', head: true })
      .is('embedding', null);
    if (error) {
      if (isMissingSchemaError(error)) return 0;
      throw new Error(error.message);
    }
    return count ?? 0;
  };
  const [dispositivos, trechos] = await Promise.all([contar('dispositivos'), contar('documento_trechos')]);
  return dispositivos + trechos;
}

async function atualizarContagens(documentoIds: Set<string>): Promise<void> {
  for (const id of documentoIds) {
    const [ctb, pop] = await Promise.all(
      ['dispositivos', 'documento_trechos'].map((tabela) =>
        supabaseAdmin
          .from(tabela)
          .select('id', { count: 'exact', head: true })
          .eq('documento_id', id)
          .is('embedding', null)
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
  let atualizados = 0;
  const tocados = new Set<string>();

  try {
    while (Date.now() < deadline) {
      let lote = await pendentesDispositivos();
      if (lote.length === 0) lote = await pendentesTrechos();
      if (lote.length === 0) break;

      let vetores: number[][];
      try {
        vetores = await embeddingChain.embedBatch(lote.map((p) => p.texto));
      } catch (error) {
        return {
          atualizados,
          restantes: await countPendingEmbeddings(),
          erro: error instanceof Error ? error.message : String(error),
        };
      }

      for (let i = 0; i < lote.length; i += UPDATE_CONCURRENCY) {
        await Promise.all(
          lote.slice(i, i + UPDATE_CONCURRENCY).map(async (pendente, j) => {
            const { error } = await supabaseAdmin
              .from(pendente.tabela)
              .update({ embedding: vetores[i + j] })
              .eq('id', pendente.id);
            if (error) throw new Error(error.message);
            atualizados++;
            if (pendente.documentoId) tocados.add(pendente.documentoId);
          })
        );
      }
    }
  } finally {
    await atualizarContagens(tocados).catch((error) => console.error('Failed to refresh counts:', error));
  }

  return { atualizados, restantes: await countPendingEmbeddings() };
}
