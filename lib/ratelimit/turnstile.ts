// Cloudflare Turnstile bot protection
import { getSettings } from '@/lib/config/settings';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileResult {
  ok: boolean;
  /** True when no secret is configured — protection is effectively off */
  skipped: boolean;
  reason?: string;
}

/**
 * Whether Turnstile can and should be enforced
 * @returns True when a secret key is configured and the toggle is on
 */
export async function turnstileEnabled(): Promise<boolean> {
  const { turnstile_ativo } = await getSettings();
  return Boolean(process.env.TURNSTILE_SECRET_KEY) && turnstile_ativo;
}

/**
 * Verify a Turnstile token with Cloudflare
 * @param token - Token produced by the client widget
 * @param ipAddress - Optional client IP, improves Cloudflare's verdict
 * @returns Verification result; `skipped` is true when protection is not configured
 */
export async function verifyTurnstile(
  token: string | undefined,
  ipAddress?: string
): Promise<TurnstileResult> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    return { ok: true, skipped: true, reason: 'not-configured' };
  }

  const { turnstile_ativo } = await getSettings();
  if (!turnstile_ativo) {
    return { ok: true, skipped: true, reason: 'disabled-by-master' };
  }

  if (!token) {
    return { ok: false, skipped: false, reason: 'missing-token' };
  }

  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
        remoteip: ipAddress,
      }),
    });

    const data = (await response.json()) as {
      success?: boolean;
      'error-codes'?: string[];
    };

    if (!data.success) {
      return {
        ok: false,
        skipped: false,
        reason: (data['error-codes'] || ['verification-failed']).join(','),
      };
    }

    return { ok: true, skipped: false };
  } catch (error) {
    // Network failure: never lock an agent out of the app
    console.error('Turnstile verification error:', error);
    return { ok: true, skipped: true, reason: 'verification-unreachable' };
  }
}
