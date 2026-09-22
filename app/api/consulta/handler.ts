// Main handler for consultation queries
import { identifyQueryType, normalizeQuery } from '@/lib/query/router';
import { filterPII } from '@/lib/query/pii-filter';
import { hybridSearch } from '@/lib/search/hybrid';
import {
  buildCardFromEnquadramento,
  buildCardFromNormas,
  dispositivoToNorma,
  emptyCard,
} from '@/lib/response/card-builder';
import { getCachedCard, setCachedCard } from '@/lib/response/cache';
import { validateCitations } from '@/lib/response/validator';
import { isBackedByNormas } from '@/lib/response/card-builder';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { turnstileEnabled, verifyTurnstile } from '@/lib/ratelimit/turnstile';
import {
  findDispositivoByReferencia,
  getDispositivoByNumero,
  getEnquadramentoByCodigo,
  searchDispositivos,
} from '@/lib/db/queries';
import type { CartaoEstruturado, NormaAplicavel, TipoConsulta } from '@/lib/response/response-types';

export type ConsultaError =
  | 'rate_limit_exceeded'
  | 'ip_blocked'
  | 'turnstile_failed'
  | 'internal_error';

export interface ConsultaResponse {
  card: CartaoEstruturado;
  sucesso: boolean;
  tempo_ms: number;
  cache_hit: boolean;
  error?: ConsultaError;
}

const TIPO_POR_QUERY: Record<string, TipoConsulta> = {
  code: 'codigo',
  article: 'artigo',
  situation: 'situacao',
};

/**
 * Handle a consultation query end-to-end
 * 1. Check rate limit and block list
 * 2. Verify Turnstile when the widget is enabled
 * 3. Serve from cache when possible
 * 4. Route the query (code, article or situation)
 * 5. Build the structured card and validate its citations
 * 6. Record usage and cache the answer
 * @param consulta - User query
 * @param ipAddress - Client IP address
 * @param turnstileToken - Optional Turnstile token
 * @returns Response with a card and telemetry
 */
export async function handleConsulta(
  consulta: string,
  ipAddress: string,
  turnstileToken?: string
): Promise<ConsultaResponse> {
  const startTime = Date.now();
  const tipo = TIPO_POR_QUERY[identifyQueryType(consulta)] ?? 'situacao';

  try {
    // PII leaves this function only in filtered form: the usage log and the
    // cache key must never store plates, CPFs or CNPJs typed by the agent.
    const consultaFiltrada = filterPII(consulta);
    const limit = await checkRateLimit(ipAddress, {
      tipo,
      pergunta: consultaFiltrada,
    });
    if (!limit.allowed) {
      const erro: ConsultaError = limit.blocked ? 'ip_blocked' : 'rate_limit_exceeded';
      await recordQuery(ipAddress, consultaFiltrada, { tipo, sucesso: false, tempoMs: 0 }, limit.registroId);
      return {
        card: emptyCard(consulta, tipo),
        sucesso: false,
        tempo_ms: Date.now() - startTime,
        cache_hit: false,
        error: erro,
      };
    }

    // Turnstile: verified whenever a token is sent, and required once the IP is
    // close to the hourly limit (the abusive path).
    if (await turnstileEnabled()) {
      const requerToken = limit.remaining < 5;
      const verification =
        requerToken || turnstileToken
          ? await verifyTurnstile(turnstileToken, ipAddress)
          : { ok: true, skipped: true };
      if (!verification.ok) {
        await recordQuery(ipAddress, consultaFiltrada, { tipo, sucesso: false, tempoMs: 0 }, limit.registroId);
        return {
          card: emptyCard(consulta, tipo),
          sucesso: false,
          tempo_ms: Date.now() - startTime,
          cache_hit: false,
          error: 'turnstile_failed',
        };
      }
    }

    const cached = await getCachedCard(consultaFiltrada);
    if (cached) {
      const card = { ...cached, cache_hit: true, tempo_ms: Date.now() - startTime };
      await recordQuery(ipAddress, consultaFiltrada, {
        tipo,
        cacheHit: true,
        sucesso: true,
        tempoMs: card.tempo_ms,
        modelo: 'cache',
      }, limit.registroId);
      return {
        card,
        sucesso: card.sucesso,
        tempo_ms: card.tempo_ms,
        cache_hit: true,
      };
    }

    const card = await buildAnswer(consulta, tipo);
    const validated = validateCard(card);
    const tempo = Date.now() - startTime;
    const finalCard: CartaoEstruturado = { ...validated, tempo_ms: tempo, cache_hit: false };

    await recordQuery(ipAddress, consultaFiltrada, {
      tipo,
      cacheHit: false,
      sucesso: finalCard.sucesso,
      tempoMs: tempo,
      modelo: 'database',
    }, limit.registroId);

    if (finalCard.sucesso) {
      await setCachedCard(consultaFiltrada, finalCard);
    }

    return { card: finalCard, sucesso: finalCard.sucesso, tempo_ms: tempo, cache_hit: false };
  } catch (error) {
    console.error('Consulta failed:', error);
    await recordQuery(ipAddress, filterPII(consulta), { tipo, sucesso: false, tempoMs: Date.now() - startTime });
    return {
      card: emptyCard(consulta, tipo),
      sucesso: false,
      tempo_ms: Date.now() - startTime,
      cache_hit: false,
      error: 'internal_error',
    };
  }
}

/**
 * Route the query to the right data source and build its card
 * @param consulta - User query
 * @param tipo - Query classification
 * @returns Structured card
 */
async function buildAnswer(
  consulta: string,
  tipo: TipoConsulta
): Promise<CartaoEstruturado> {
  const normalized = normalizeQuery(consulta);
  const filtered = filterPII(consulta).trim();

  if (tipo === 'codigo') {
    const enquadramento = await getEnquadramentoByCodigo(filtered);
    if (!enquadramento) {
      const proximos = await searchDispositivos(normalized, 5);
      return buildCardFromNormas(proximos, consulta, 'codigo');
    }

    const normas = await getNormasForEnquadramento(enquadramento.amparo_legal, enquadramento.descricao);
    return buildCardFromEnquadramento(enquadramento, consulta, normas);
  }

  if (tipo === 'artigo') {
    const dispositivo =
      (await getDispositivoByNumero(normalized)) ?? (await findDispositivoByReferencia(filtered));

    if (dispositivo) {
      const relacionadas = normalizeRelated(dispositivo, await searchDispositivos(normalized, 3));
      return buildCardFromNormas([dispositivo, ...relacionadas], consulta, 'artigo');
    }
  }

  const resultados = await safeHybridSearch(normalized);
  if (resultados.length > 0) {
    return buildCardFromNormas(resultados, consulta, tipo);
  }

  // Last resort for article lookups: full-text search on the normalized query
  const texto = await searchDispositivos(normalized, 5);
  return buildCardFromNormas(texto, consulta, tipo);
}

/**
 * Collect the norms that back an enquadramento: the cited article plus related text
 * @param amparoLegal - Amparo legal from the enquadramento
 * @param descricao - Infraction description, used as a fallback search
 * @returns Applicable norms (deduplicated)
 */
async function getNormasForEnquadramento(
  amparoLegal: string,
  descricao: string
): Promise<NormaAplicavel[]> {
  const normas: NormaAplicavel[] = [];

  const principal = await findDispositivoByReferencia(amparoLegal);
  if (principal) {
    normas.push(dispositivoToNorma(principal));
  }

  const relacionados = await searchDispositivos(normalizeQuery(descricao), 3);
  for (const row of relacionados) {
    if (!normas.some((n) => n.numero_dispositivo === row.numero_dispositivo)) {
      normas.push(dispositivoToNorma(row));
    }
  }

  return normas;
}

/**
 * Remove duplicated provisions from a related-norms list
 * @param principal - The provision already in the card
 * @param rows - Candidate rows
 * @returns Rows that are not the principal provision
 */
function normalizeRelated(principal: { numero_dispositivo: string }, rows: any[]): any[] {
  return rows.filter((r) => r.numero_dispositivo !== principal.numero_dispositivo);
}

/**
 * Run the hybrid search, degrading to an empty result when it is unavailable
 * @param query - Normalized query
 * @returns Ranked rows, possibly empty
 */
async function safeHybridSearch(query: string): Promise<any[]> {
  try {
    return await hybridSearch(query, 5);
  } catch (error) {
    console.warn('Hybrid search unavailable:', error);
    return [];
  }
}

/**
 * Ensure every citation in the card is backed by the retrieved norms.
 * Unverified citations are dropped rather than shown as trustworthy.
 * @param card - Card to validate
 * @returns Card with validated citations only
 */
function validateCard(card: CartaoEstruturado): CartaoEstruturado {
  if (!card.citacoes || card.citacoes.length === 0) {
    return { ...card, citacoes: [] };
  }

  // Structural check: keep only citations backed by the retrieved norms.
  // This does not depend on the validator's message format (which is an
  // implementation detail) and never drops explicitly unverified citations.
  const citacoesFiltradas = card.citacoes.filter(
    (c) => !c.validada || isBackedByNormas(c.dispositivo, card.normas)
  );

  // Regex sweep over the free-text fields as a second line of defense.
  const { issues } = validateCitations(
    JSON.stringify([card.explicacao_simples, card.exemplo_dia_a_dia]),
    card.normas
  );
  if (issues.length === 0) {
    return { ...card, citacoes: citacoesFiltradas };
  }

  const invalidas = new Set(
    issues.map((i) => i.replace(/^Citation not found: "/, '').replace(/"$/, ''))
  );
  return {
    ...card,
    explicacao_simples: dropInvalidCitations(card.explicacao_simples, invalidas),
    exemplo_dia_a_dia: dropInvalidCitations(card.exemplo_dia_a_dia, invalidas),
    citacoes: citacoesFiltradas,
  };
}

/**
 * Remove article references that validation flagged as unbacked from free text
 * @param texto - Free-text field of the card
 * @param invalidas - Article keys flagged by the validator (e.g. "art. 999 § 2")
 * @returns Text without the unbacked references
 */
function dropInvalidCitations(texto: string, invalidas: Set<string>): string {
  let resultado = texto;
  for (const chave of invalidas) {
    const escapado = chave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    resultado = resultado.replace(new RegExp(`${escapado}(?![\\d])\\s*,?\\s*`, 'gi'), '');
  }
  return resultado;
}
