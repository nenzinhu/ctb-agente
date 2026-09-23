import { Enquadramento } from '@/lib/db/schema';
import { CartaoEstruturado } from '@/lib/response/response-types';
import {
  FAVORITES_STORAGE_KEY,
  MAX_FAVORITES,
  clearFavorites,
  favoriteId,
  getFavorites,
  isFavorite,
  removeFavorite,
  toggleFavorite,
} from '@/lib/favorites/favorites';

function enquadramento(overrides: Partial<Enquadramento> = {}): Enquadramento {
  return {
    id: '1',
    codigo_mbft: '516-91',
    desdobramento: 0,
    descricao: 'Estacionar em local proibido',
    gravidade: 'gravíssima',
    pontos: 7,
    valor_multa: 29347,
    unidade: 'UIRF 2026',
    retem_veiculo: false,
    remove_veiculo: true,
    recolhe_documento: 'crlv',
    amparo_legal: 'art. 181, inciso XVII do CTB',
    medida_administrativa: 'Remoção obrigatória',
    responsavel: 'proprietario',
    criado_em: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function card(overrides: Partial<CartaoEstruturado> = {}): CartaoEstruturado {
  return {
    tipo: 'situacao',
    sucesso: true,
    consulta: 'consulta',
    enquadramento: null,
    normas: [],
    checklist_ait: [],
    erros_comuns: [],
    concurso_infracoes: [],
    crime_transito: false,
    categoria_cnh_exigida: '',
    normas_relacionadas: [],
    jurisprudencia: [],
    explicacao_simples: '',
    exemplo_dia_a_dia: '',
    citacoes: [],
    cache_hit: false,
    tempo_ms: 0,
    ...overrides,
  };
}

describe('favorites', () => {
  beforeEach(() => localStorage.clear());

  it('identifies a card by its MBFT code', () => {
    expect(favoriteId(card({ enquadramento: enquadramento() }))).toBe('codigo:516-91');
  });

  it('includes the desdobramento in the id', () => {
    const comDesdobramento = card({ enquadramento: enquadramento({ desdobramento: 2 }) });
    expect(favoriteId(comDesdobramento)).toBe('codigo:516-91#2');
  });

  it('falls back to the query when there is no enquadramento', () => {
    expect(favoriteId(card({ consulta: ' Art. 165 ' }))).toBe('consulta:art. 165');
  });

  it('saves and removes through the toggle', () => {
    const c = card({ enquadramento: enquadramento() });

    expect(toggleFavorite(c)).toBe(true);
    expect(isFavorite(c)).toBe(true);
    expect(getFavorites()).toHaveLength(1);

    expect(toggleFavorite(c)).toBe(false);
    expect(isFavorite(c)).toBe(false);
    expect(getFavorites()).toHaveLength(0);
  });

  it('keeps a single entry when the same card is saved again', () => {
    const c = card({ enquadramento: enquadramento() });
    toggleFavorite(c);
    toggleFavorite(c);
    toggleFavorite(c);

    expect(getFavorites()).toHaveLength(1);
    expect(isFavorite(c)).toBe(true);
  });

  it('lists the newest card first', () => {
    toggleFavorite(card({ consulta: 'primeira' }));
    toggleFavorite(card({ consulta: 'segunda' }));

    expect(getFavorites().map((f) => f.card.consulta)).toEqual(['segunda', 'primeira']);
  });

  it('caps the stored cards at MAX_FAVORITES', () => {
    for (let i = 0; i < MAX_FAVORITES + 5; i += 1) {
      toggleFavorite(card({ consulta: `consulta ${i}` }));
    }

    const salvos = getFavorites();
    expect(salvos).toHaveLength(MAX_FAVORITES);
    expect(salvos[0].card.consulta).toBe(`consulta ${MAX_FAVORITES + 4}`);
  });

  it('removes a single favorite by id', () => {
    toggleFavorite(card({ consulta: 'a' }));
    toggleFavorite(card({ consulta: 'b' }));

    removeFavorite('consulta:a');

    expect(getFavorites().map((f) => f.card.consulta)).toEqual(['b']);
  });

  it('clears every favorite', () => {
    toggleFavorite(card({ consulta: 'a' }));
    clearFavorites();

    expect(getFavorites()).toEqual([]);
  });

  it('survives corrupted storage', () => {
    const erroSilenciado = jest.spyOn(console, 'error').mockImplementation(() => {});
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{not json');

    expect(getFavorites()).toEqual([]);
    expect(toggleFavorite(card({ consulta: 'a' }))).toBe(true);

    expect(erroSilenciado).toHaveBeenCalled();
    erroSilenciado.mockRestore();
  });

  it('ignores entries that are not favorites', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([{ id: 'x' }, null, 42]));

    expect(getFavorites()).toEqual([]);
  });
});
