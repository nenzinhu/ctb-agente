// GET /api/health — liveness probe used by the deployment guide and CI smoke tests
import { getEmbeddingConfig } from '@/lib/ai/embedding-config';
import type { EmbeddingConfig } from '@/lib/ai/embedding-models';
import { NextResponse } from 'next/server';
import { databaseAdminConfigured, databaseConfigured, supabase, supabaseAdmin } from '@/lib/db/client';
import { listProviders } from '@/lib/ai/providers/registry';
import { getSettings } from '@/lib/config/settings';

export const dynamic = 'force-dynamic';

interface HealthPayload {
  status: 'ok' | 'degraded';
  timestamp: string;
  versao: string;
  banco: 'ok' | 'indisponivel';
  bancoEscrita: 'ok' | 'indisponivel';
  esquemaRag: number | null;
  configuracoes: { consultas_por_hora: number; turnstile_ativo: boolean };
  provedoresConfigurados: string[];
  provedoresAusentes: string[];
  cache: 'ok' | 'indisponivel';
  /** Busca semântica: sem chave de embedding metade da busca híbrida fica de fora. */
  embeddings: 'ok' | 'indisponivel';
  modeloVetorial: string;
  avisos: string[];
}

/**
 * Check whether the vector-search RPC is reachable (migration 003 applied)
 * @returns 'ok' when the RPC answers, 'indisponivel' otherwise
 */
async function checkVectorRpc(config: EmbeddingConfig): Promise<boolean> {
  try {
    // Never true for a zero vector against real rows; cheap and needs no key.
    const { error } = await supabase.rpc(config.coluna === 'embedding_nemotron' ? 'search_dispositivos_nemotron' : 'search_dispositivos_vector', {
      query_embedding: new Array(1024).fill(0),
      limit_count: 1,
    });
    // PGRST202 = function not found (migration 003 pending)
    return !error || (error as { code?: string }).code !== 'PGRST202';
  } catch {
    return false;
  }
}

async function checkRagSchema(): Promise<number | null> {
  try {
    const { data, error } = await supabase.rpc('rag_schema_version');
    if (error || typeof data !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * GET /api/health
 * @returns 200 when the app is up; `degraded` when the database is unreachable
 */
export async function GET() {
  let banco: 'ok' | 'indisponivel' = 'ok';
  let cache: 'ok' | 'indisponivel' = 'ok';
  const config = await getEmbeddingConfig();
  let embeddings: 'ok' | 'indisponivel' = config.configurado ? 'ok' : 'indisponivel';
  let esquemaRag: number | null = null;
  const avisos: string[] = [];

  if (!databaseConfigured) {
    banco = 'indisponivel';
    cache = 'indisponivel';
    embeddings = 'indisponivel';
  } else {
    try {
      const { error } = await supabase
        .from('dispositivos')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      if (error) banco = 'indisponivel';
    } catch {
      banco = 'indisponivel';
    }

    try {
      if (!databaseAdminConfigured) {
        cache = 'indisponivel';
      } else {
        const { error } = await supabaseAdmin
          .from('cache_respostas')
          .select('*', { count: 'exact', head: true })
          .limit(1);
        if (error) cache = 'indisponivel';
      }
    } catch {
      cache = 'indisponivel';
    }

    const rpcOk = await checkVectorRpc(config);
    if (!rpcOk) {
      embeddings = 'indisponivel';
      avisos.push(config.coluna === 'embedding_nemotron'
        ? 'Busca Nemotron indisponível: aplique scripts/migrations-015-nemotron-embeddings.sql e gere os vetores pendentes.'
        : 'Busca vetorial indisponível: aplique scripts/migrations-003-search-functions.sql.');
    }

    esquemaRag = await checkRagSchema();
    if (esquemaRag === null || esquemaRag < 10) {
      avisos.push('RAG sem o ajuste de precisão e prefixos: aplique scripts/migrations-010-rag-precision-performance.sql.');
    }
  }


  if (!databaseAdminConfigured) {
    avisos.push(
      'Escritas administrativas indisponíveis: defina SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  if (embeddings === 'indisponivel') {
    avisos.push(
      `Busca semântica indisponível para ${config.nome}: verifique ${config.envVar} e a migração do modelo. A busca textual continua disponível (alternativa: MISTRAL_API_KEY).`
    );
  }

  const providers = listProviders();
  const settings = await getSettings();

  const payload: HealthPayload = {
    status: banco === 'ok' && databaseAdminConfigured ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    versao: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    banco,
    bancoEscrita: databaseAdminConfigured ? 'ok' : 'indisponivel',
    esquemaRag,
    cache,
    embeddings,
    modeloVetorial: config.id,
    configuracoes: settings,
    provedoresConfigurados: providers.filter((p) => p.configurado).map((p) => p.nome),
    provedoresAusentes: providers.filter((p) => !p.configurado).map((p) => p.nome),
    avisos,
  };

  return NextResponse.json(payload, { status: payload.status === 'ok' ? 200 : 503 });
}
