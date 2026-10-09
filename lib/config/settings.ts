// Runtime configuration backed by the `configuracoes` table.
// Every read falls back to safe defaults when the database is unreachable,
// so the app keeps working before the migrations are applied.
import { databaseAdminConfigured, supabaseAdmin } from '@/lib/db/client';

export interface AppSettings {
  consultas_por_hora: number;
  turnstile_ativo: boolean;
  /** Weight applied to infraction articles (161-255) in hybrid search ranking */
  pesoInfracoes?: number;
  /** RRF smoothing constant for hybrid search */
  rrfK?: number;
  /** Minimum chunk size in characters */
  minChunkChars?: number;
  /** Default chunk size in characters */
  defaultChunkChars?: number;
  /** Per-provider timeout in ms */
  providerTimeoutMs?: number;
  /** Max retry attempts per provider call */
  providerMaxAttempts?: number;
  /** Cache TTL in days for response cache */
  cacheTtlDias?: number;
  /** Whether to enable debug logging */
  debugLog?: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  consultas_por_hora: Number(process.env.RATE_LIMIT_QUERIES_PER_HOUR || 30),
  turnstile_ativo: true,
  pesoInfracoes: 1.04,
  rrfK: 60,
  minChunkChars: 20,
  defaultChunkChars: 1200,
  providerTimeoutMs: 25_000,
  providerMaxAttempts: 3,
  cacheTtlDias: 30,
  debugLog: false,
};

const SETTINGS_CACHE_MS = 30_000;
const SETTINGS_KEY = 'app';

let cached: { settings: AppSettings; expiresAt: number } | null = null;

/**
 * Read the current application settings, falling back to defaults on failure
 * @returns Effective settings
 */
export async function getSettings(): Promise<AppSettings> {
  if (cached && cached.expiresAt > Date.now()) {
    return cached.settings;
  }

  let settings = DEFAULT_SETTINGS;
  if (!databaseAdminConfigured) {
    cached = { settings, expiresAt: Date.now() + SETTINGS_CACHE_MS };
    return settings;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('configuracoes')
      .select('valor')
      .eq('chave', SETTINGS_KEY)
      .maybeSingle();

    if (!error && data?.valor) {
      settings = { ...DEFAULT_SETTINGS, ...(data.valor as Partial<AppSettings>) };
    }
  } catch (error) {
    console.warn('Settings unavailable, using defaults:', error);
  }

  cached = { settings, expiresAt: Date.now() + SETTINGS_CACHE_MS };
  return settings;
}

/**
 * Persist a partial settings update and refresh the in-memory cache
 * @param patch - Fields to change
 * @returns The full settings after the update
 */
export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  const next: AppSettings = {
    consultas_por_hora: sanitizeRateLimit(patch.consultas_por_hora ?? current.consultas_por_hora),
    turnstile_ativo: patch.turnstile_ativo ?? current.turnstile_ativo,
    pesoInfracoes: sanitizeFloat(patch.pesoInfracoes ?? current.pesoInfracoes ?? 1.04, 1.0, 2.0),
    rrfK: sanitizeInt(patch.rrfK ?? current.rrfK ?? 60, 1, 500),
    minChunkChars: sanitizeInt(patch.minChunkChars ?? current.minChunkChars ?? 20, 1, 500),
    defaultChunkChars: sanitizeInt(patch.defaultChunkChars ?? current.defaultChunkChars ?? 1200, 50, 5000),
    providerTimeoutMs: sanitizeInt(patch.providerTimeoutMs ?? current.providerTimeoutMs ?? 25_000, 1_000, 120_000),
    providerMaxAttempts: sanitizeInt(patch.providerMaxAttempts ?? current.providerMaxAttempts ?? 3, 1, 10),
    cacheTtlDias: sanitizeInt(patch.cacheTtlDias ?? current.cacheTtlDias ?? 30, 1, 365),
    debugLog: patch.debugLog ?? current.debugLog ?? false,
  };

  const { error } = await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: SETTINGS_KEY, valor: next, atualizado_em: new Date().toISOString() });

  if (error) {
    throw new Error(`Falha ao salvar as configurações: ${error.message}`);
  }

  cached = { settings: next, expiresAt: Date.now() + SETTINGS_CACHE_MS };
  return next;
}

/**
 * Drop the cached settings (used after an external change)
 */
export function invalidateSettingsCache(): void {
  cached = null;
}

/**
 * Clamp the rate limit to a sane range
 * @param value - Requested value
 * @returns Integer between 1 and 1000
 */
export function sanitizeRateLimit(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.consultas_por_hora;
  return Math.min(1000, Math.max(1, Math.trunc(value)));
}

/**
 * Clamp a float to a range
 */
export function sanitizeFloat(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * Clamp an integer to a range
 */
export function sanitizeInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

/**
 * List IPs explicitly blocked by the master
 * @returns Blocked IP addresses
 */
export async function listBlockedIps(): Promise<string[]> {
  if (!databaseAdminConfigured) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from('ip_bloqueados')
      .select('ip')
      .order('criado_em', { ascending: false });

    if (error || !data) return [];
    return data.map((row) => String(row.ip));
  } catch {
    return [];
  }
}

/**
 * Check whether an IP is on the block list
 * @param ip - Client IP
 * @returns True when the IP must be refused
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
  if (!ip || !databaseAdminConfigured) return false;
  try {
    const { data, error } = await supabaseAdmin
      .from('ip_bloqueados')
      .select('ip')
      .eq('ip', ip)
      .maybeSingle();

    return !error && Boolean(data);
  } catch {
    return false;
  }
}

/**
 * Add an IP to the block list
 * @param ip - Client IP
 * @param motivo - Optional reason shown in the admin panel
 */
export async function blockIp(ip: string, motivo = ''): Promise<void> {
  const { error } = await supabaseAdmin
    .from('ip_bloqueados')
    .upsert({ ip, motivo, criado_em: new Date().toISOString() });

  if (error) {
    throw new Error(`Falha ao bloquear o IP: ${error.message}`);
  }
}

/**
 * Remove an IP from the block list
 * @param ip - Client IP
 */
export async function unblockIp(ip: string): Promise<void> {
  const { error } = await supabaseAdmin.from('ip_bloqueados').delete().eq('ip', ip);

  if (error) {
    throw new Error(`Falha ao desbloquear o IP: ${error.message}`);
  }
}
