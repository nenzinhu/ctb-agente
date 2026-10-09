'use client';

import { createClient } from '@supabase/supabase-js';

/**
 * Browser-safe Supabase client (anon/publishable key only — both
 * NEXT_PUBLIC_* and already shipped to the client bundle). Used solely for
 * `storage.uploadToSignedUrl`: the signed URL's embedded token is what
 * authorizes the write, not this key, so the Storage bucket stays private
 * with no anon policies.
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-key'
);
