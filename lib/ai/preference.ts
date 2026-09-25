// Which provider/model the master picked in the admin panel, stored in the
// `configuracoes` table (key "ia"). Mirrors lib/config/settings.ts: reads
// fall back to "no preference" when the database is unreachable.
import { databaseConfigured, supabase, supabaseAdmin } from '@/lib/db/client';

export interface AIPreference {
  providerId: string;
  modelo: string;
}

const PREFERENCE_KEY = 'ia';
const CACHE_MS = 30_000;

let cached: { value: AIPreference | null; expiresAt: number } | null = null;

/**
 * @returns The chosen provider/model, or null when none was picked
 */
export async function getAIPreference(): Promise<AIPreference | null> {
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  let value: AIPreference | null = null;
  if (databaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', PREFERENCE_KEY)
        .maybeSingle();
      const valor = data?.valor as Partial<AIPreference> | undefined;
      if (!error && valor?.providerId && valor?.modelo) {
        value = { providerId: valor.providerId, modelo: valor.modelo };
      }
    } catch (error) {
      console.warn('AI preference unavailable:', error);
    }
  }

  cached = { value, expiresAt: Date.now() + CACHE_MS };
  return value;
}

/**
 * Persists the master's choice (null clears it: back to the default order)
 */
export async function setAIPreference(value: AIPreference | null): Promise<void> {
  const { error } = value
    ? await supabaseAdmin
        .from('configuracoes')
        .upsert({ chave: PREFERENCE_KEY, valor: value, atualizado_em: new Date().toISOString() })
    : await supabaseAdmin.from('configuracoes').delete().eq('chave', PREFERENCE_KEY);

  if (error) {
    throw new Error(`Failed to persist AI preference: ${error.message}`);
  }
  cached = { value, expiresAt: Date.now() + CACHE_MS };
}
