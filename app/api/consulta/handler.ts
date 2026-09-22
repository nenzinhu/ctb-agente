// Main handler for consultation queries
import { identifyQueryType, normalizeQuery } from '@/lib/query/router';
import { filterPII } from '@/lib/query/pii-filter';
import { hybridSearch } from '@/lib/search/hybrid';
import { buildCard } from '@/lib/response/card-builder';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { verifyTurnstile } from '@/lib/ratelimit/turnstile';
import { supabase } from '@/lib/db/client';

/**
 * Handle a consultation query end-to-end
 * 1. Check rate limit
 * 2. Verify Turnstile (if needed)
 * 3. Identify query type
 * 4. Filter PII
 * 5. Search (direct lookup or hybrid search)
 * 6. Build response card
 * 7. Record usage
 * @param consulta - User query
 * @param ipAddress - Client IP address
 * @param turnstileToken - Optional Turnstile token
 * @returns Response object or error
 */
export async function handleConsulta(
  consulta: string,
  ipAddress: string,
  turnstileToken?: string
) {
  // Rate limit check
  const { allowed, remaining } = await checkRateLimit(ipAddress);
  if (!allowed) {
    return { error: 'Rate limit exceeded', remaining };
  }

  // Turnstile check (if suspicious)
  if (remaining < 5 && turnstileToken) {
    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return { error: 'Turnstile verification failed' };
    }
  }

  // Identify query type
  const queryType = identifyQueryType(consulta);
  const normalized = normalizeQuery(consulta);
  const filtered = filterPII(consulta);

  // Handle code or article lookups directly
  if (queryType === 'code') {
    const { data: enquadramento } = await supabase
      .from('enquadramentos')
      .select('*')
      .eq('codigo_mbft', filtered)
      .single();

    await recordQuery(ipAddress, consulta);
    return { enquadramento, type: 'code' };
  }

  // Hybrid search for situations
  const results = await hybridSearch(normalized, 5);
  const card = await buildCard(results[0]?.numero_dispositivo || '', results);

  await recordQuery(ipAddress, consulta);
  return { card, type: 'situation' };
}
