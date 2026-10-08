// Hybrid search over the document base (migration 008): the POP-PMSC
// collection, or any other kept in `documento_trechos`.
import { databaseAdminConfigured, supabaseAdmin } from '@/lib/db/client';
import { embeddingChain } from '@/lib/ai/embeddings';
import { MigrationPendingError, isMissingSchemaError, type Colecao } from '@/lib/ingestion/documents';
import { expandirSinonimos } from './sinonimos';
import { reordenarListasBusca, type ColecaoRanking } from './reranker';
import { rerankearComProvedores } from './provider-reranker';

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

const COLECAO_RANKING: Record<Colecao, ColecaoRanking> = {
  ctb: 'ctb',
  pop: 'pop',
  natureza_potencial: 'natureza_pmsc',
};

const CANDIDATOS = 20;
const TEMPO_EMBEDDING_MS = 4_000;
const TEMPO_TEXTO_MS = 1_500;

async function porTexto(consulta: string, colecao: Colecao): Promise<Linha[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const { data, error } = await Promise.race([
    supabaseAdmin.rpc('search_trechos_texto', {
      query_text: consulta,
      p_colecao: colecao,
      limit_count: CANDIDATOS,
    }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('busca textual demorou demais')), TEMPO_TEXTO_MS);
    }),
  ]).finally(() => clearTimeout(timer));
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
    // Word search answers in ~1s: don't let a slow embedding hold it back.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const embedding = await Promise.race([
      embeddingChain.embed(consulta),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('embedding demorou demais')), TEMPO_EMBEDDING_MS);
      }),
    ]).finally(() => clearTimeout(timer));
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
  if (!databaseAdminConfigured || !consulta.trim()) return [];

  const textoPromise = porTexto(expandirSinonimos(consulta), colecao).catch((error) => {
    if (error instanceof MigrationPendingError) throw error;
    console.warn('Text search over excerpts unavailable:', error);
    return [];
  });
  const [texto, vetor] = await Promise.all([textoPromise, porVetor(consulta, colecao)]);
  const local = reordenarListasBusca(consulta, COLECAO_RANKING[colecao], texto, vetor);
  return (await rerankearComProvedores(consulta, local)).slice(0, limite);
}
