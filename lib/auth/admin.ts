import * as bcryptjs from 'bcryptjs';

/**
 * Admin credentials validation
 * Username is hardcoded as 'nenzinhu', password is hashed with bcrypt
 */

const ADMIN_USERNAME = 'nenzinhu';

/**
 * Whether the master password hash is configured
 * @returns True when ADMIN_PASSWORD_HASH is present
 */
export function adminPasswordConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSWORD_HASH);
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
  if (username !== ADMIN_USERNAME) {
    return false;
  }

  // Get password hash from environment
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!passwordHash) {
    if (process.env.NODE_ENV === 'production') {
      console.error(
        'ADMIN_PASSWORD_HASH is not set: refusing admin login in production. Configure it to enable the panel.'
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
  return ADMIN_USERNAME;
}
