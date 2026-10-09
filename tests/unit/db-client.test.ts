/**
 * @jest-environment node
 */

const originalEnv = process.env;

describe('Supabase client configuration', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('prefers modern publishable and secret keys', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role';

    const createClient = jest.fn((url: string, key: string) => ({ url, key }));
    jest.doMock('@supabase/supabase-js', () => ({ createClient }));

    const client = await import('@/lib/db/client');

    expect(client.databaseConfigured).toBe(true);
    expect(client.databaseAdminConfigured).toBe(true);
    expect(createClient).toHaveBeenNthCalledWith(
      1,
      'https://example.supabase.co',
      'sb_publishable_test'
    );
    expect(createClient).toHaveBeenNthCalledWith(2, 'https://example.supabase.co', 'sb_secret_test');
  });

  it('keeps compatibility with legacy anon and service-role keys', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://legacy.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'legacy-anon';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy-service-role';

    const createClient = jest.fn((url: string, key: string) => ({ url, key }));
    jest.doMock('@supabase/supabase-js', () => ({ createClient }));

    const client = await import('@/lib/db/client');

    expect(client.databaseConfigured).toBe(true);
    expect(client.databaseAdminConfigured).toBe(true);
    expect(createClient).toHaveBeenNthCalledWith(1, 'https://legacy.supabase.co', 'legacy-anon');
    expect(createClient).toHaveBeenNthCalledWith(
      2,
      'https://legacy.supabase.co',
      'legacy-service-role'
    );
  });
});
