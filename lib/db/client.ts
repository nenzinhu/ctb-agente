import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'placeholder-key';
const supabaseServiceKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'placeholder-key';

/**
 * Whether real Supabase credentials are present.
 *
 * Data helpers check this flag and fail fast when they are not: without it,
 * every call would retry against a placeholder host and a single consultation
 * would hang for tens of seconds on a fresh checkout.
 */
export const databaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
);

/** Server-side writes and private RAG tables require the service-role binding. */
export const databaseAdminConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
);

export const supabase = createClient(supabaseUrl, supabaseKey);

// For server-side operations (with service role key)
const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';

export const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey);
