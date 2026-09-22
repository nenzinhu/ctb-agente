// Main handler for consultation queries
import { identifyQueryType, normalizeQuery } from '@/lib/query/router';
import { filterPII } from '@/lib/query/pii-filter';
import { hybridSearch } from '@/lib/search/hybrid';
import { buildCard } from '@/lib/response/card-builder';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { verifyTurnstile } from '@/lib/ratelimit/turnstile';
import { validateCitations } from '@/lib/response/validator';
import { getDispositivoByNumero } from '@/lib/db/queries';
import { supabase } from '@/lib/db/client';
import type { CartaoEstruturado } from '@/lib/response/response-types';

export interface ConsultaResponse {
  card?: CartaoEstruturado;
  enquadramento?: any;
  error?: string;
  type?: 'code' | 'situation';
  sucesso: boolean;
  tempo_ms: number;
}

/**
 * Handle a consultation query end-to-end
 * 1. Check rate limit
 * 2. Verify Turnstile (if needed)
 * 3. Identify query type
 * 4. Filter PII
 * 5. Search (direct lookup or hybrid search)
 * 6. Build response card
 * 7. Validate citations
 * 8. Record usage
 * @param consulta - User query
 * @param ipAddress - Client IP address
 * @param turnstileToken - Optional Turnstile token
 * @returns Response object or error
 */
export async function handleConsulta(
  consulta: string,
  ipAddress: string,
  turnstileToken?: string
): Promise<ConsultaResponse> {
  const startTime = Date.now();
  // Rate limit check
  const { allowed, remaining } = await checkRateLimit(ipAddress);
  if (!allowed) {
    return { error: 'Rate limit exceeded', sucesso: false, tempo_ms: Date.now() - startTime };
  }

  // Turnstile check (if suspicious)
  if (remaining < 5 && turnstileToken) {
    const turnstileValid = await verifyTurnstile(turnstileToken);
    if (!turnstileValid) {
      return { error: 'Turnstile verification failed', sucesso: false, tempo_ms: Date.now() - startTime };
    }
  }

  // Identify query type
  const queryType = identifyQueryType(consulta);
  const normalized = normalizeQuery(consulta);
  const filtered = filterPII(consulta);

  // Handle code lookups directly
  if (queryType === 'code') {
    const { data: enquadramento } = await supabase
      .from('enquadramentos')
      .select('*')
      .eq('codigo_mbft', filtered)
      .single();

    await recordQuery(ipAddress, consulta);
    return { enquadramento, type: 'code', sucesso: !!enquadramento, tempo_ms: Date.now() - startTime };
  }

  // Handle article lookups directly
  if (queryType === 'article') {
    const dispositivo = await getDispositivoByNumero(normalized);
    if (dispositivo) {
      const card = await buildCard(dispositivo.numero_dispositivo, [dispositivo]);

      // Validate citations
      const validation = validateCitations(JSON.stringify(card), [dispositivo]);
      if (card.citacoes) {
        card.citacoes = card.citacoes.filter(c => validation.valid);
      }

      await recordQuery(ipAddress, consulta);
      return { card, type: 'situation', sucesso: true, tempo_ms: Date.now() - startTime };
    }
  }

  // Hybrid search for situations
  const results = await hybridSearch(normalized, 5);
  const card = await buildCard(results[0]?.numero_dispositivo || '', results);

  // Validate citations
  const validation = validateCitations(JSON.stringify(card), results);
  if (card.citacoes) {
    card.citacoes = card.citacoes.filter(c => validation.valid);
  }

  await recordQuery(ipAddress, consulta);
  return { card, type: 'situation', sucesso: results.length > 0, tempo_ms: Date.now() - startTime };
}
