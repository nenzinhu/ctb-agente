import { cookies } from 'next/headers';
import {
  type AdminSession,
  sessionSecret,
  signSession,
  verifySessionToken,
} from './session-token';

/**
 * Session management for the admin panel using signed httpOnly cookies
 */

export type { AdminSession };

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a new signed admin session cookie
 * @param username - Authenticated master username
 * @throws When no signing secret is configured (production without ADMIN_PASSWORD_HASH)
 */
export async function createSession(username: string): Promise<void> {
  const secret = sessionSecret();
  if (!secret) {
    throw new Error(
      'ADMIN_PASSWORD_HASH (ou ADMIN_SESSION_SECRET) não configurada: login do painel indisponível.'
    );
  }

  const now = Date.now();
  const session: AdminSession = {
    username,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, await signSession(session, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Get the current admin session from cookies, verifying the signature
 * @returns Valid session, or null when missing, forged or expired
 */
export async function getSession(): Promise<AdminSession | null> {
  const secret = sessionSecret();
  if (!secret) {
    console.error('Admin session secret is not configured; refusing every session.');
    return null;
  }

  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!sessionCookie?.value) return null;

    const session = await verifySessionToken(sessionCookie.value, secret);
    if (!session) {
      // Invalid or forged cookie: drop it so the next request starts clean
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}

/**
 * Clear the admin session (logout)
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Validate that a session exists and is not expired
 */
export async function validateSession(): Promise<boolean> {
  const session = await getSession();
  return session !== null;
}
