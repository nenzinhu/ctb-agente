// Cloudflare Turnstile bot protection
/**
 * Verify Turnstile CAPTCHA token with Cloudflare
 * @param token - Turnstile token from client
 * @returns True if verification succeeds
 */
export async function verifyTurnstile(token: string): Promise<boolean> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) return true; // Skip if not configured

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/validate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    }
  );

  const data = await response.json();
  return data.success;
}
