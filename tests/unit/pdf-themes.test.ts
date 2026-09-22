// Unit tests for the thematic dossiê configuration
import {
  SECOES_PADRAO,
  THEMES,
  buildPdfCacheKey,
  filterByTheme,
  getTheme,
  normalizeSecoes,
} from '@/lib/pdf/themes';

describe('dossiê themes', () => {
  it('exposes unique ids', () => {
    const ids = THEMES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('resolves a theme by id', () => {
    expect(getTheme('alcoolemia')?.label).toMatch(/Alcoolemia/);
    expect(getTheme('inexistente')).toBeNull();
  });
});

describe('filterByTheme', () => {
  const enquadramentos = [
    { codigo_mbft: '516-91', descricao: 'vaga de idoso' },
    { codigo_mbft: '517-32', descricao: 'guidom' },
    { codigo_mbft: '745-52', descricao: 'velocidade' },
    { codigo_mbft: '737-19', descricao: 'alcoolemia' },
  ];

  it('keeps only the codes that belong to the theme', () => {
    const filtrados = filterByTheme(enquadramentos, 'estacionamento');
    expect(filtrados.map((e) => e.codigo_mbft)).toEqual(['516-91', '517-32']);
  });

  it('selects the speed theme', () => {
    expect(filterByTheme(enquadramentos, 'velocidade').map((e) => e.codigo_mbft)).toEqual([
      '745-52',
    ]);
  });

  it('returns nothing for an unknown theme', () => {
    expect(filterByTheme(enquadramentos, 'nao-existe')).toEqual([]);
  });

  it('ignores malformed rows', () => {
    expect(filterByTheme([{ codigo_mbft: null }, {}], 'estacionamento')).toEqual([]);
  });
});

describe('normalizeSecoes', () => {
  it('falls back to the default sections', () => {
    expect(normalizeSecoes(undefined)).toEqual(SECOES_PADRAO);
    expect(normalizeSecoes(null)).toEqual(SECOES_PADRAO);
  });

  it('honours explicit booleans', () => {
    const secoes = normalizeSecoes({ projetosDeLei: true, normas: false });
    expect(secoes.projetosDeLei).toBe(true);
    expect(secoes.normas).toBe(false);
    expect(secoes.enquadramentos).toBe(SECOES_PADRAO.enquadramentos);
  });

  it('ignores non-boolean values', () => {
    const secoes = normalizeSecoes({ normas: 'sim' } as unknown as { normas: boolean });
    expect(secoes.normas).toBe(SECOES_PADRAO.normas);
  });
});

describe('PDF cache key', () => {
  it('changes with the theme, the sections and the corpus version', () => {
    const base = buildPdfCacheKey('estacionamento', SECOES_PADRAO, 'd10-e5');
    const outroTema = buildPdfCacheKey('velocidade', SECOES_PADRAO, 'd10-e5');
    const outrasSecoes = buildPdfCacheKey(
      'estacionamento',
      { ...SECOES_PADRAO, normas: false },
      'd10-e5'
    );
    const outraVersao = buildPdfCacheKey('estacionamento', SECOES_PADRAO, 'd11-e5');

    expect(new Set([base, outroTema, outrasSecoes, outraVersao]).size).toBe(4);
  });

  it('is stable for the same request', () => {
    expect(buildPdfCacheKey('estacionamento', SECOES_PADRAO, 'd1-e1')).toBe(
      buildPdfCacheKey('estacionamento', { ...SECOES_PADRAO }, 'd1-e1')
    );
  });
});
