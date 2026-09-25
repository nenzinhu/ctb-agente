/**
 * @jest-environment node
 */
// Tests for session management, backed by an in-memory cookie store.
// Node environment: the session token uses Web Crypto (crypto.subtle), which
// jsdom does not implement.
const cookieStore = new Map<string, string>();

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) =>
      cookieStore.has(name) ? { name, value: cookieStore.get(name) as string } : undefined,
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
}));

import { clearSession, createSession, getSession, validateSession } from '@/lib/auth/session';

const COOKIE = 'admin_session';

describe('Session Management', () => {
  beforeEach(() => {
    cookieStore.clear();
  });

  it('creates a session and stores it as a cookie', async () => {
    await createSession('nenzinhu');

    expect(cookieStore.has(COOKIE)).toBe(true);

    // The cookie is `<hex payload>.<hmac>`, never plain JSON
    const token = cookieStore.get(COOKIE) as string;
    const [payload, signature] = token.split('.');
    expect(signature).toMatch(/^[0-9a-f]{64}$/);

    const json = new TextDecoder().decode(
      new Uint8Array((payload.match(/../g) as string[]).map((byte) => parseInt(byte, 16)))
    );
    const stored = JSON.parse(json);
    expect(stored.username).toBe('nenzinhu');
    expect(stored.expiresAt).toBeGreaterThan(Date.now());
  });

  it('retrieves a valid session', async () => {
    await createSession('nenzinhu');

    const session = await getSession();
    expect(session?.username).toBe('nenzinhu');
    expect(await validateSession()).toBe(true);
  });

  it('returns null when no session exists', async () => {
    expect(await getSession()).toBeNull();
    expect(await validateSession()).toBe(false);
  });

  it('rejects and clears an expired session', async () => {
    cookieStore.set(
      COOKIE,
      JSON.stringify({ username: 'nenzinhu', createdAt: 0, expiresAt: Date.now() - 1000 })
    );

    expect(await getSession()).toBeNull();
    expect(cookieStore.has(COOKIE)).toBe(false);
  });

  it('survives a malformed cookie value', async () => {
    cookieStore.set(COOKIE, 'not-json');
    expect(await getSession()).toBeNull();
  });

  it('rejects a hand-written session cookie (no signature)', async () => {
    // This is exactly the cookie an attacker would craft by hand
    cookieStore.set(
      COOKIE,
      JSON.stringify({ username: 'invasor', createdAt: 0, expiresAt: Date.now() + 86400000 })
    );

    expect(await getSession()).toBeNull();
    expect(await validateSession()).toBe(false);
    expect(cookieStore.has(COOKIE)).toBe(false);
  });

  it('rejects a tampered payload', async () => {
    await createSession('nenzinhu');

    const original = cookieStore.get(COOKIE) as string;
    const [payload, signature] = original.split('.');
    const adulterado = JSON.stringify({
      username: 'invasor',
      createdAt: 0,
      expiresAt: Date.now() + 86400000,
    });
    const novoPayload = [...new TextEncoder().encode(adulterado)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    cookieStore.set(COOKIE, `${novoPayload}.${signature}`);
    expect(await getSession()).toBeNull();
    expect(payload).not.toBe(novoPayload);
  });

  it('rejects a token with a swapped signature', async () => {
    await createSession('nenzinhu');

    const [payload] = (cookieStore.get(COOKIE) as string).split('.');
    cookieStore.set(COOKIE, `${payload}.${'a'.repeat(64)}`);
    expect(await getSession()).toBeNull();
  });

  it('clears the session on logout', async () => {
    await createSession('nenzinhu');
    await clearSession();

    expect(cookieStore.has(COOKIE)).toBe(false);
    expect(await validateSession()).toBe(false);
  });
});
