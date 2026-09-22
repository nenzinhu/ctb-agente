// Unit tests for the runtime settings module
const respostas: Record<string, { data: unknown; error: unknown }> = {};
const upserts: { tabela: string; valor: unknown }[] = [];

jest.mock('../../lib/db/client', () => {
  const chain = (tabela: string): Record<string, unknown> => {
    const resultado = () => Promise.resolve(respostas[tabela] ?? { data: null, error: null });
    const self: Record<string, unknown> = {};
    self.select = () => self;
    self.eq = () => self;
    self.order = () => self;
    self.maybeSingle = () => resultado();
    self.single = () => resultado();
    self.upsert = (valor: unknown) => {
      upserts.push({ tabela, valor });
      return resultado();
    };
    self.delete = () => self;
    self.then = (resolve: (value: unknown) => unknown) => resultado().then(resolve);
    return self;
  };

  const client = { from: (tabela: string) => chain(tabela) };
  return { databaseConfigured: true, supabase: client, supabaseAdmin: client };
});

import {
  DEFAULT_SETTINGS,
  blockIp,
  getSettings,
  invalidateSettingsCache,
  isIpBlocked,
  listBlockedIps,
  sanitizeRateLimit,
  unblockIp,
  updateSettings,
} from '@/lib/config/settings';

describe('sanitizeRateLimit', () => {
  it('clamps to a usable range', () => {
    expect(sanitizeRateLimit(0)).toBe(1);
    expect(sanitizeRateLimit(-10)).toBe(1);
    expect(sanitizeRateLimit(5000)).toBe(1000);
    expect(sanitizeRateLimit(42.9)).toBe(42);
  });

  it('falls back to the default when the value is not a number', () => {
    expect(sanitizeRateLimit(Number.NaN)).toBe(DEFAULT_SETTINGS.consultas_por_hora);
  });
});

describe('getSettings', () => {
  beforeEach(() => {
    invalidateSettingsCache();
    for (const chave of Object.keys(respostas)) delete respostas[chave];
  });

  it('uses the defaults when the table is empty', async () => {
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('merges the stored value over the defaults', async () => {
    respostas.configuracoes = {
      data: { valor: { consultas_por_hora: 7 } },
      error: null,
    };

    const settings = await getSettings();
    expect(settings.consultas_por_hora).toBe(7);
    expect(settings.turnstile_ativo).toBe(DEFAULT_SETTINGS.turnstile_ativo);
  });

  it('falls back to the defaults when the database errors', async () => {
    respostas.configuracoes = { data: null, error: { message: 'boom' } };
    await expect(getSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('caches the read between calls', async () => {
    respostas.configuracoes = { data: { valor: { consultas_por_hora: 11 } }, error: null };
    await getSettings();

    respostas.configuracoes = { data: { valor: { consultas_por_hora: 99 } }, error: null };
    await expect(getSettings()).resolves.toMatchObject({ consultas_por_hora: 11 });
  });
});

describe('updateSettings', () => {
  beforeEach(() => {
    invalidateSettingsCache();
    upserts.length = 0;
    for (const chave of Object.keys(respostas)) delete respostas[chave];
  });

  it('persists a sanitized payload', async () => {
    const settings = await updateSettings({ consultas_por_hora: 99999 });

    expect(settings.consultas_por_hora).toBe(1000);
    expect(upserts).toHaveLength(1);
    expect(upserts[0].tabela).toBe('configuracoes');
    expect(upserts[0].valor).toMatchObject({
      chave: 'app',
      valor: { consultas_por_hora: 1000 },
    });
  });

  it('throws when the write fails', async () => {
    respostas.configuracoes = { data: null, error: { message: 'permission denied' } };
    await expect(updateSettings({ turnstile_ativo: false })).rejects.toThrow(/permission denied/);
  });
});

describe('IP block list', () => {
  beforeEach(() => {
    for (const chave of Object.keys(respostas)) delete respostas[chave];
  });

  it('lists blocked IPs', async () => {
    respostas.ip_bloqueados = { data: [{ ip: '203.0.113.9' }], error: null };
    await expect(listBlockedIps()).resolves.toEqual(['203.0.113.9']);
  });

  it('returns an empty list on failure', async () => {
    respostas.ip_bloqueados = { data: null, error: { message: 'boom' } };
    await expect(listBlockedIps()).resolves.toEqual([]);
  });

  it('reports whether an IP is blocked', async () => {
    respostas.ip_bloqueados = { data: { ip: '203.0.113.9' }, error: null };
    await expect(isIpBlocked('203.0.113.9')).resolves.toBe(true);
  });

  it('never blocks when the database is unreachable', async () => {
    respostas.ip_bloqueados = { data: null, error: { message: 'boom' } };
    await expect(isIpBlocked('203.0.113.9')).resolves.toBe(false);
    await expect(isIpBlocked('')).resolves.toBe(false);
  });

  it('writes and removes entries', async () => {
    await expect(blockIp('198.51.100.4', 'abuso')).resolves.toBeUndefined();
    await expect(unblockIp('198.51.100.4')).resolves.toBeUndefined();
    expect(upserts.some((u) => u.tabela === 'ip_bloqueados')).toBe(true);
  });
});
