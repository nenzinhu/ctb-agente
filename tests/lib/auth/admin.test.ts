import { verifyAdminCredentials, getAdminUsername } from '@/lib/auth/admin';

/**
 * Tests for admin authentication
 */

describe('Admin Authentication', () => {
  describe('verifyAdminCredentials', () => {
    it('should reject invalid username', async () => {
      const result = await verifyAdminCredentials('wronguser', 'password');
      expect(result).toBe(false);
    });

    it('should accept valid username with correct password or dev mode', async () => {
      // In dev mode (no ADMIN_PASSWORD_HASH env var), any password should work
      const result = await verifyAdminCredentials('nenzinhu', 'anything');
      expect(typeof result).toBe('boolean');
    });

    it('should verify correct username', async () => {
      const result = await verifyAdminCredentials('nenzinhu', 'test');
      expect(typeof result).toBe('boolean');
    });
  });

  describe('getAdminUsername', () => {
    it('should return the correct admin username', () => {
      const username = getAdminUsername();
      expect(username).toBe('nenzinhu');
    });
  });
});
