// Rate limiting logic
//
// Reads/writes `uso_diario` with the service-role client on purpose: this
// table holds every visitor's IP and question text, and this module only
// ever runs server-side, so there is no reason to expose it through the
// anon-key RLS policy the client bundle can extract.
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import { getSettings, isIpBlocked } from '@/lib/config/settings';
import type { TipoConsulta } from '@/lib/response/response-types';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  blocked: boolean;
  retryAfterSeconds: number;
}

export interface UsoDia {
  dia: string;
  consultas: number;
  cacheHits: number;
  falhas: number;
}

export interface UsoStats {
  porDia: UsoDia[];
  total: number;
  cacheHits: number;
  falhas: number;
  perguntasSemResposta: { pergunta: string; timestamp: string }[];
  provedoresComFalha: { modelo: string; falhas: number }[];
}

/**
 * Check if an IP address is within the rate limit
 * Fails open: an unreachable database must never block a traffic agent.
 * @param ipAddress - Client IP address
 * @returns Rate limit decision for this request
 */
export async function checkRateLimit(ipAddress: string): Promise<RateLimitResult> {
  const settings = await getSettings();
  const limite = settings.consultas_por_hora;

  const blocked = await isIpBlocked(ipAddress);
  if (blocked) {
    return {
      allowed: false,
      remaining: 0,
      limit: limite,
      blocked: true,
      retryAfterSeconds: 3600,
    };
  }

  if (!databaseConfigured) {
    return {
      allowed: true,
      remaining: limite,
      limit: limite,
      blocked: false,
      retryAfterSeconds: 0,
    };
  }

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  try {
    const { count, error } = await supabaseAdmin
      .from('uso_diario')
      .select('*', { count: 'exact', head: true })
      .eq('ip_endereco', ipAddress)
      .gte('timestamp', oneHourAgo.toISOString());

    if (error) throw error;

    const usadas = count || 0;
    return {
      allowed: usadas < limite,
      remaining: Math.max(0, limite - usadas),
      limit: limite,
      blocked: false,
      retryAfterSeconds: 3600,
    };
  } catch (error) {
    console.warn('Rate limit check failed, allowing request:', error);
    return {
      allowed: true,
      remaining: limite,
      limit: limite,
      blocked: false,
      retryAfterSeconds: 0,
    };
  }
}

export interface QueryDetails {
  tipo?: TipoConsulta;
  cacheHit?: boolean;
  sucesso?: boolean;
  tempoMs?: number;
  modelo?: string;
}

/**
 * Record a query in the usage log
 * @param ipAddress - Client IP address
 * @param consulta - Original query text (kept for the "unanswered questions" report)
 * @param details - Extra telemetry for the admin panel
 */
export async function recordQuery(
  ipAddress: string,
  consulta: string,
  details: QueryDetails = {}
): Promise<void> {
  if (!databaseConfigured) return;

  try {
    await supabaseAdmin.from('uso_diario').insert({
      ip_endereco: ipAddress,
      pergunta: consulta.slice(0, 500),
      tipo_consulta: details.tipo ?? 'situacao',
      cache_hit: details.cacheHit ?? false,
      modelo_ia_usado: details.modelo ?? 'database',
      sucesso: details.sucesso ?? true,
      tempo_ms: details.tempoMs ?? null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to record query usage:', error);
  }
}

/**
 * Aggregate usage statistics for the admin panel
 * @param dias - How many days back to look
 * @returns Usage stats
 */
export async function getUsageStats(dias = 30): Promise<UsoStats> {
  const vazio: UsoStats = {
    porDia: [],
    total: 0,
    cacheHits: 0,
    falhas: 0,
    perguntasSemResposta: [],
    provedoresComFalha: [],
  };

  if (!databaseConfigured) return vazio;

  try {
    const desde = new Date(Date.now() - dias * 86_400_000).toISOString();
    const { data, error } = await supabaseAdmin
      .from('uso_diario')
      .select('pergunta, timestamp, cache_hit, sucesso, modelo_ia_usado')
      .gte('timestamp', desde)
      .order('timestamp', { ascending: false })
      .limit(10000);

    if (error || !data) return vazio;

    const porDiaMap = new Map<string, UsoDia>();
    const semResposta: { pergunta: string; timestamp: string }[] = [];
    const falhasPorModelo = new Map<string, number>();
    let cacheHits = 0;
    let falhas = 0;

    for (const row of data) {
      const dia = String(row.timestamp).slice(0, 10);
      const atual = porDiaMap.get(dia) ?? { dia, consultas: 0, cacheHits: 0, falhas: 0 };
      atual.consultas += 1;
      if (row.cache_hit) {
        atual.cacheHits += 1;
        cacheHits += 1;
      }
      if (row.sucesso === false) {
        atual.falhas += 1;
        falhas += 1;
        if (row.pergunta) {
          semResposta.push({ pergunta: String(row.pergunta), timestamp: String(row.timestamp) });
        }
        const modelo = String(row.modelo_ia_usado ?? 'desconhecido');
        falhasPorModelo.set(modelo, (falhasPorModelo.get(modelo) ?? 0) + 1);
      }
      porDiaMap.set(dia, atual);
    }

    return {
      porDia: [...porDiaMap.values()].sort((a, b) => a.dia.localeCompare(b.dia)),
      total: data.length,
      cacheHits,
      falhas,
      perguntasSemResposta: semResposta.slice(0, 50),
      provedoresComFalha: [...falhasPorModelo.entries()]
        .map(([modelo, n]) => ({ modelo, falhas: n }))
        .sort((a, b) => b.falhas - a.falhas),
    };
  } catch (error) {
    console.warn('Failed to load usage stats:', error);
    return vazio;
  }
}
