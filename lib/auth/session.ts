import { cookies } from 'next/headers';

/**
 * Session management for admin panel using httpOnly cookies
 */

export interface AdminSession {
  username: string;
  createdAt: number;
  expiresAt: number;
}

const SESSION_COOKIE_NAME = 'admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create a new admin session and set it as a secure httpOnly cookie
 */
export async function createSession(username: string): Promise<void> {
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  const session: AdminSession = {
    username,
    createdAt: now,
    expiresAt,
  };

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS / 1000, // Convert to seconds
    path: '/',
  });
}

/**
 * Get the current admin session from cookies
 */
export async function getSession(): Promise<AdminSession | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const session: AdminSession = JSON.parse(sessionCookie.value);

    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      // Clear expired session
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
