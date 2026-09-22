// Signed admin session tokens.
//
// The cookie used to be raw JSON: anyone could write
// `admin_session={"expiresAt":<future>}` by hand and walk into /admin.
// Payloads are now hex-encoded JSON with an HMAC-SHA256 signature.
//
// This module is intentionally free of Node APIs: it runs both in the Edge
// middleware and in Node route handlers, using Web Crypto in both.

export interface AdminSession {
  username: string;
  createdAt: number;
  expiresAt: number;
}

/** Secret used only outside production so local development needs no setup. */
const DEV_SECRET = 'ctb-dev-secret-nao-use-em-producao';

/**
 * Resolve the signing secret.
 *
 * Order of preference: an explicit session secret, the admin password hash
 * (always present when the panel is actually usable) and, outside production
 * only, a well-known development constant.
 *
 * @returns Secret, or null when the deployment is misconfigured
 */
export function sessionSecret(): string | null {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (process.env.ADMIN_PASSWORD_HASH) return process.env.ADMIN_PASSWORD_HASH;
  return process.env.NODE_ENV === 'production' ? null : DEV_SECRET;
}

/**
 * UTF-8 string to hex
 * @param valor - Input string
 * @returns Hex string
 */
function toHex(valor: string): string {
  return [...new TextEncoder().encode(valor)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Hex back to a UTF-8 string
 * @param hex - Hex string
 * @returns Decoded string, or null when the input is not valid hex
 */
function fromHex(hex: string): string | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * HMAC-SHA256 of the payload
 * @param payload - Hex-encoded payload
 * @param secret - Signing secret
 * @returns Hex signature
 */
async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const assinatura = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(assinatura)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compare two strings without leaking length-relative timing
 * @param a - First value
 * @param b - Second value
 * @returns True when equal
 */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diferenca = 0;
  for (let i = 0; i < a.length; i++) {
    diferenca |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferenca === 0;
}

/**
 * Serialize and sign a session
 * @param session - Session to sign
 * @param secret - Signing secret
 * @returns `<payload>.<signature>`
 */
export async function signSession(session: AdminSession, secret: string): Promise<string> {
  const payload = toHex(JSON.stringify(session));
  return `${payload}.${await sign(payload, secret)}`;
}

/**
 * Verify a session token and return its payload
 * @param token - Cookie value
 * @param secret - Signing secret
 * @returns Session, or null when the token is missing, malformed, forged or expired
 */
export async function verifySessionToken(
  token: string | undefined,
  secret: string
): Promise<AdminSession | null> {
  if (!token) return null;

  const separador = token.lastIndexOf('.');
  if (separador <= 0) return null;

  const payload = token.slice(0, separador);
  const assinatura = token.slice(separador + 1);
  if (!payload || !assinatura) return null;

  const esperada = await sign(payload, secret);
  if (!safeEqual(assinatura, esperada)) return null;

  const json = fromHex(payload);
  if (!json) return null;

  try {
    const session = JSON.parse(json) as Partial<AdminSession>;
    if (
      typeof session?.username !== 'string' ||
      typeof session?.expiresAt !== 'number' ||
      typeof session?.createdAt !== 'number'
    ) {
      return null;
    }
    if (session.expiresAt < Date.now()) return null;

    return { username: session.username, createdAt: session.createdAt, expiresAt: session.expiresAt };
  } catch {
    return null;
  }
}
