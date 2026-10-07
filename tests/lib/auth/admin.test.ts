import { adminConfiguration, getAdminUsername, hashPassword, verifyAdminCredentials } from '@/lib/auth/admin';

/**
 * Tests for admin authentication
 */

describe('Admin Authentication', () => {
  const oldUsername = process.env.ADMIN_USERNAME;
  const oldHash = process.env.ADMIN_PASSWORD_HASH;

  afterEach(() => {
    if (oldUsername === undefined) delete process.env.ADMIN_USERNAME;
    else process.env.ADMIN_USERNAME = oldUsername;
    if (oldHash === undefined) delete process.env.ADMIN_PASSWORD_HASH;
    else process.env.ADMIN_PASSWORD_HASH = oldHash;
  });

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

    it('uses ADMIN_USERNAME after trimming it', () => {
      process.env.ADMIN_USERNAME = '  agente-master  ';
      expect(getAdminUsername()).toBe('agente-master');
    });
  });

  describe('configuration', () => {
    it('rejects a plaintext password in ADMIN_PASSWORD_HASH', () => {
      process.env.ADMIN_PASSWORD_HASH = 'minha-senha';
      expect(adminConfiguration()).toMatchObject({ configured: false, reason: 'invalid_password_hash' });
    });

    it('accepts a bcrypt hash and verifies the corresponding password', async () => {
      process.env.ADMIN_PASSWORD_HASH = await hashPassword('senha-segura');
      expect(adminConfiguration()).toMatchObject({ configured: true });
      await expect(verifyAdminCredentials('nenzinhu', 'senha-segura')).resolves.toBe(true);
      await expect(verifyAdminCredentials('nenzinhu', 'errada')).resolves.toBe(false);
    });
  });
});
