import * as bcryptjs from 'bcryptjs';

/**
 * Admin credentials validation
 * Username is hardcoded as 'nenzinhu', password is hashed with bcrypt
 */

const ADMIN_USERNAME = 'nenzinhu';

/**
 * Verify admin credentials
 * If ADMIN_PASSWORD_HASH is not set, allow login for development
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

  // Development mode: if no hash set, allow any password
  if (!passwordHash) {
    console.warn(
      'ADMIN_PASSWORD_HASH not set - running in development mode with no password requirement'
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
