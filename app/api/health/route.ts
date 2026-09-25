// GET /api/health — liveness probe used by the deployment guide and CI smoke tests
import { NextResponse } from 'next/server';
import { databaseConfigured, supabase } from '@/lib/db/client';
import { listProviders } from '@/lib/ai/providers/registry';
import { getSettings } from '@/lib/config/settings';

export const dynamic = 'force-dynamic';

interface HealthPayload {
  status: 'ok' | 'degraded';
  timestamp: string;
  versao: string;
  banco: 'ok' | 'indisponivel';
  configuracoes: { consultas_por_hora: number; turnstile_ativo: boolean };
  provedoresConfigurados: string[];
  provedoresAusentes: string[];
  cache: 'ok' | 'indisponivel';
  /** Busca semântica: sem chave de embedding metade da busca híbrida fica de fora. */
  embeddings: 'ok' | 'indisponivel';
  avisos: string[];
}

/**
 * Check whether the vector-search RPC is reachable (migration 003 applied)
 * @returns 'ok' when the RPC answers, 'indisponivel' otherwise
 */
async function checkVectorRpc(): Promise<boolean> {
  try {
    // Never true for a zero vector against real rows; cheap and needs no key.
    const { error } = await supabase.rpc('search_dispositivos_vector', {
      query_embedding: new Array(1024).fill(0),
      limit_count: 1,
    });
    // PGRST202 = function not found (migration 003 pending)
    return !error || (error as { code?: string }).code !== 'PGRST202';
  } catch {
    return false;
  }
}

/**
 * GET /api/health
 * @returns 200 when the app is up; `degraded` when the database is unreachable
 */
export async function GET() {
  let banco: 'ok' | 'indisponivel' = 'ok';
  let cache: 'ok' | 'indisponivel' = 'ok';
  let embeddings: 'ok' | 'indisponivel' = process.env.MISTRAL_API_KEY ? 'ok' : 'indisponivel';
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
      const { error } = await supabase
        .from('cache_respostas')
        .select('*', { count: 'exact', head: true })
        .limit(1);
      if (error) cache = 'indisponivel';
    } catch {
      cache = 'indisponivel';
    }

    const rpcOk = await checkVectorRpc();
    if (!rpcOk) {
      avisos.push('Busca vetorial indisponível: aplique scripts/migrations-003-search-functions.sql.');
    }
  }

  if (embeddings === 'indisponivel') {
    avisos.push(
      'Busca semântica desativada: defina MISTRAL_API_KEY — sem ela a busca híbrida roda só com BM25.'
    );
  }

  const providers = listProviders();
  const settings = await getSettings();

  const payload: HealthPayload = {
    status: banco === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    versao: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    banco,
    cache,
    embeddings,
    configuracoes: settings,
    provedoresConfigurados: providers.filter((p) => p.configurado).map((p) => p.nome),
    provedoresAusentes: providers.filter((p) => !p.configurado).map((p) => p.nome),
    avisos,
  };

  return NextResponse.json(payload, { status: payload.status === 'ok' ? 200 : 503 });
}
