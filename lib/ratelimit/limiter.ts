// Rate limiting logic
import { supabase } from '@/lib/db/client';

const RATE_LIMIT_QUERIES_PER_HOUR = parseInt(
  process.env.RATE_LIMIT_QUERIES_PER_HOUR || '30'
);

/**
 * Check if an IP address is within rate limit
 * @param ipAddress - Client IP address
 * @returns Object with allowed flag and remaining queries
 */
export async function checkRateLimit(
  ipAddress: string
): Promise<{ allowed: boolean; remaining: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

  // Count queries in the last hour
  const { count, error } = await supabase
    .from('uso_diario')
    .select('*', { count: 'exact' })
    .eq('ip_endereco', ipAddress)
    .gte('timestamp', oneHourAgo.toISOString());

  if (error) throw error;

  const queryCount = count || 0;
  const remaining = Math.max(0, RATE_LIMIT_QUERIES_PER_HOUR - queryCount);

  return {
    allowed: queryCount < RATE_LIMIT_QUERIES_PER_HOUR,
    remaining,
  };
}

/**
 * Record a query in the usage log
 * @param ipAddress - Client IP address
 * @param consulta - Original query text (optional, for logging)
 */
export async function recordQuery(ipAddress: string, _consulta: string): Promise<void> {
  await supabase.from('uso_diario').insert({
    ip_endereco: ipAddress,
    tipo_consulta: 'situacao',
    timestamp: new Date().toISOString(),
  });
}
