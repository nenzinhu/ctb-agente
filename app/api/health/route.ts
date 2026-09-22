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
}

/**
 * GET /api/health
 * @returns 200 when the app is up; `degraded` when the database is unreachable
 */
export async function GET() {
  let banco: 'ok' | 'indisponivel' = 'ok';
  let cache: 'ok' | 'indisponivel' = 'ok';

  if (!databaseConfigured) {
    banco = 'indisponivel';
    cache = 'indisponivel';
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
  }

  const providers = listProviders();
  const settings = await getSettings();

  const payload: HealthPayload = {
    status: banco === 'ok' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    versao: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'local',
    banco,
    cache,
    configuracoes: settings,
    provedoresConfigurados: providers.filter((p) => p.configurado).map((p) => p.nome),
    provedoresAusentes: providers.filter((p) => !p.configurado).map((p) => p.nome),
  };

  return NextResponse.json(payload, { status: payload.status === 'ok' ? 200 : 503 });
}
