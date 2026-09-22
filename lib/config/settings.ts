// Runtime configuration backed by the `configuracoes` table.
// Every read falls back to safe defaults when the database is unreachable,
// so the app keeps working before the migrations are applied.
import { databaseConfigured, supabase, supabaseAdmin } from '@/lib/db/client';

export interface AppSettings {
  consultas_por_hora: number;
  turnstile_ativo: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  consultas_por_hora: Number(process.env.RATE_LIMIT_QUERIES_PER_HOUR || 30),
  turnstile_ativo: true,
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
  if (!databaseConfigured) {
    cached = { settings, expiresAt: Date.now() + SETTINGS_CACHE_MS };
    return settings;
  }

  try {
    const { data, error } = await supabase
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
  };

  const { error } = await supabaseAdmin
    .from('configuracoes')
    .upsert({ chave: SETTINGS_KEY, valor: next, atualizado_em: new Date().toISOString() });

  if (error) {
    throw new Error(`Failed to persist settings: ${error.message}`);
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
 * List IPs explicitly blocked by the master
 * @returns Blocked IP addresses
 */
export async function listBlockedIps(): Promise<string[]> {
  if (!databaseConfigured) return [];
  try {
    const { data, error } = await supabase
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
  if (!ip || !databaseConfigured) return false;
  try {
    const { data, error } = await supabase
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
    throw new Error(`Failed to block IP: ${error.message}`);
  }
}

/**
 * Remove an IP from the block list
 * @param ip - Client IP
 */
export async function unblockIp(ip: string): Promise<void> {
  const { error } = await supabaseAdmin.from('ip_bloqueados').delete().eq('ip', ip);

  if (error) {
    throw new Error(`Failed to unblock IP: ${error.message}`);
  }
}
