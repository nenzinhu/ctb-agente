// Rate limiting logic
//
// Reads/writes `uso_diario` with the service-role client on purpose: this
// table holds every visitor's IP and question text, and this module only
// ever runs server-side, so there is no reason to expose it through the
// anon-key RLS policy the client bundle can extract.
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import { getSettings, isIpBlocked } from '@/lib/config/settings';
import type { TipoConsulta } from '@/lib/response/response-types';

/** What was consulted: the CTB card flows, or the POP-PMSC base. */
export type TipoUso = TipoConsulta | 'pop';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  blocked: boolean;
  retryAfterSeconds: number;
  /**
   * Row reserved for this attempt in `uso_diario` (migration 007). When set,
   * recordQuery updates it instead of inserting a second row — the count that
   * decided the limit already includes it.
   */
  registroId: string | null;
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

interface RpcLimitResult {
  id?: string;
  usadas?: number;
  permitido?: boolean;
  restantes?: number;
  limite?: number;
}

/**
 * Check if an IP address is within the rate limit, reserving this attempt.
 * Uses the atomic RPC from migration 007 (insert + count in one sentence),
 * which closes the race where a burst of simultaneous requests all read the
 * same count and pass. Fails open: an unreachable database must never block
 * a traffic agent.
 * @param ipAddress - Client IP address
 * @param attempt - Query classification and PII-filtered text for the usage log
 * @returns Rate limit decision for this request (with the reserved row id)
 */
export async function checkRateLimit(
  ipAddress: string,
  attempt: { tipo?: TipoUso; pergunta?: string } = {}
): Promise<RateLimitResult> {
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
      registroId: null,
    };
  }

  if (!databaseConfigured) {
    return {
      allowed: true,
      remaining: limite,
      limit: limite,
      blocked: false,
      retryAfterSeconds: 0,
      registroId: null,
    };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('register_query_and_check_limit', {
      p_ip: ipAddress,
      p_limit: limite,
      p_tipo_consulta: attempt.tipo ?? 'situacao',
      p_pergunta: attempt.pergunta?.slice(0, 500) ?? null,
    });

    if (error) throw error;

    const resultado = (Array.isArray(data) ? data[0] : data) as RpcLimitResult | null;
    return {
      allowed: resultado?.permitido !== false,
      remaining: Number(resultado?.restantes ?? limite),
      limit: Number(resultado?.limite ?? limite),
      blocked: false,
      retryAfterSeconds: 3600,
      registroId: resultado?.id ?? null,
    };
  } catch (error) {
    // Migration 007 not applied yet: fall back to count-then-insert so rate
    // limiting keeps working (without the atomicity) until it is.
    if (isMissingRpcError(error)) {
      return await legacyCountThenCheck(ipAddress, limite);
    }
    console.warn('Rate limit check failed, allowing request:', error);
    return {
      allowed: true,
      remaining: limite,
      limit: limite,
      blocked: false,
      retryAfterSeconds: 0,
      registroId: null,
    };
  }
}

/**
 * Pre-migration fallback: count recent rows and decide (racy on bursts).
 * @param ipAddress - Client IP address
 * @param limite - Configured hourly limit
 * @returns Decision without a reserved row
 */
async function legacyCountThenCheck(ipAddress: string, limite: number): Promise<RateLimitResult> {
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
      registroId: null,
    };
  } catch (error) {
    console.warn('Rate limit check failed, allowing request:', error);
    return {
      allowed: true,
      remaining: limite,
      limit: limite,
      blocked: false,
      retryAfterSeconds: 0,
      registroId: null,
    };
  }
}

/**
 * Detect the Supabase error raised when the RPC is absent (migration pending)
 * @param error - Error thrown by the rpc() call
 * @returns True when the function does not exist in the database
 */
function isMissingRpcError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'PGRST202' || code === '42883') return true;
  const mensagem = error instanceof Error ? error.message : String(error ?? '');
  return /could not find the function|function.*does not exist|schema cache/i.test(mensagem);
}

export interface QueryDetails {
  tipo?: TipoUso;
  cacheHit?: boolean;
  sucesso?: boolean;
  tempoMs?: number;
  modelo?: string;
}

/**
 * Record a query in the usage log
 * @param ipAddress - Client IP address
 * @param consulta - PII-filtered query text (kept for the "unanswered questions" report)
 * @param details - Extra telemetry for the admin panel
 * @param registroId - Reserved row id from checkRateLimit; updates it instead of inserting twice
 */
export async function recordQuery(
  ipAddress: string,
  consulta: string,
  details: QueryDetails = {},
  registroId: string | null = null
): Promise<void> {
  if (!databaseConfigured) return;

  try {
    if (registroId) {
      await supabaseAdmin
        .from('uso_diario')
        .update({
          cache_hit: details.cacheHit ?? false,
          modelo_ia_usado: details.modelo ?? 'database',
          sucesso: details.sucesso ?? true,
          tempo_ms: details.tempoMs ?? null,
        })
        .eq('id', registroId);
      return;
    }

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
