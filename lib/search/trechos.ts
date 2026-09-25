// Hybrid search over the document base (migration 008): the POP-PMSC
// collection, or any other kept in `documento_trechos`.
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import { embeddingChain } from '@/lib/ai/embeddings';
import { MigrationPendingError, isMissingSchemaError, type Colecao } from '@/lib/ingestion/documents';
import { reciprocalRankFusion } from './fusion';
import { expandirSinonimos } from './sinonimos';

export interface TrechoEncontrado {
  id: string;
  documento_id: string;
  titulo: string;
  secao: string | null;
  pagina: number | null;
  ordem: number;
  texto: string;
  score: number;
}

type Linha = Omit<TrechoEncontrado, 'score'>;

const CANDIDATOS = 20;

async function porTexto(consulta: string, colecao: Colecao): Promise<Linha[]> {
  const { data, error } = await supabaseAdmin.rpc('search_trechos_texto', {
    query_text: consulta,
    p_colecao: colecao,
    limit_count: CANDIDATOS,
  });
  if (error) {
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    console.warn('Text search over excerpts failed:', error);
    return [];
  }
  return (data ?? []) as Linha[];
}

async function porVetor(consulta: string, colecao: Colecao): Promise<Linha[]> {
  if (!process.env.MISTRAL_API_KEY) return [];
  try {
    const embedding = await embeddingChain.embed(consulta);
    const { data, error } = await supabaseAdmin.rpc('search_trechos_vetor', {
      query_embedding: embedding,
      p_colecao: colecao,
      limit_count: CANDIDATOS,
    });
    if (error) throw error;
    return (data ?? []) as Linha[];
  } catch (error) {
    // Semantic search is a bonus on top of word search, never a blocker.
    console.warn('Vector search over excerpts unavailable:', error);
    return [];
  }
}

/**
 * @param consulta - Question, PII already filtered
 * @param colecao - Collection to search
 * @param limite - How many excerpts to return
 * @returns Most relevant excerpts first
 * @throws MigrationPendingError when migration 008 is not applied
 */
export async function buscarTrechos(consulta: string, colecao: Colecao, limite = 6): Promise<TrechoEncontrado[]> {
  if (!databaseConfigured || !consulta.trim()) return [];

  const [texto, vetor] = await Promise.all([porTexto(expandirSinonimos(consulta), colecao), porVetor(consulta, colecao)]);
  return reciprocalRankFusion([texto, vetor]).slice(0, limite);
}
