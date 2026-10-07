import * as bcryptjs from 'bcryptjs';

/**
 * Admin credentials validation
 * Username comes from ADMIN_USERNAME (default: nenzinhu); the password is
 * stored only as a bcrypt hash.
 */
const DEFAULT_ADMIN_USERNAME = 'nenzinhu';

export type AdminConfiguration =
  | { configured: true; username: string }
  | { configured: false; username: string; reason: 'missing_password_hash' | 'invalid_password_hash' };

const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

/**
 * Whether the master password hash is configured
 * @returns True when ADMIN_PASSWORD_HASH is present
 */
export function adminPasswordConfigured(): boolean {
  return adminConfiguration().configured;
}

/** Safe configuration metadata; never returns the hash or session secret. */
export function adminConfiguration(): AdminConfiguration {
  const username = getAdminUsername();
  const hash = process.env.ADMIN_PASSWORD_HASH?.trim();
  if (!hash) return { configured: false, username, reason: 'missing_password_hash' };
  if (!BCRYPT_HASH.test(hash)) return { configured: false, username, reason: 'invalid_password_hash' };
  return { configured: true, username };
}

/**
 * Verify admin credentials
 *
 * Without ADMIN_PASSWORD_HASH the panel is open to anyone, so the open mode is
 * restricted to non-production environments: a production deployment that
 * forgot the variable fails closed instead of exposing the master panel.
 */
export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<boolean> {
  // Username must match
  if (username.trim() !== getAdminUsername()) {
    return false;
  }

  // Get password hash from environment
  const passwordHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!passwordHash || !BCRYPT_HASH.test(passwordHash)) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'ADMIN_PASSWORD_HASH is missing or is not a bcrypt hash: refusing admin login in production.'
      );
      return false;
    }

    console.warn(
      'ADMIN_PASSWORD_HASH not set - development mode: any password is accepted locally'
    );
    return true;
  }

  // Production mode: verify password against hash
  try {
    return await bcryptjs.compare(password, passwordHash);
  } catch (error) {
    console.error('Error verifying password:', error);
    return false;
  }
}

/**
 * Generate a bcrypt hash for a password
 * Use this to create ADMIN_PASSWORD_HASH for .env.local
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return bcryptjs.hash(password, saltRounds);
}

/**
 * Get the admin username
 */
export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME?.trim() || DEFAULT_ADMIN_USERNAME;
}
