// Device-local favorites: cards the agent saves to reuse in the field.
// Nothing here ever leaves the device — favorites live only in localStorage.
import type { CartaoEstruturado } from '@/lib/response/response-types';

export const FAVORITES_STORAGE_KEY = 'ctb-favoritos';

/** A saved card plus when it was saved. */
export interface CartaoFavorito {
  id: string;
  salvo_em: string;
  card: CartaoEstruturado;
}

/** Each card is a few kB and localStorage is usually capped at ~5 MB. */
export const MAX_FAVORITES = 50;

/**
 * Stable id for a card, so saving the same infraction twice updates the entry
 * instead of duplicating it. Falls back to the raw query for cards without an
 * enquadramento (an article or a situation).
 * @param card - Card to identify
 * @returns Stable id
 */
export function favoriteId(card: CartaoEstruturado): string {
  const codigo = card.enquadramento?.codigo_mbft?.trim();
  if (codigo) {
    const desdobramento = card.enquadramento?.desdobramento ?? 0;
    return desdobramento > 0 ? `codigo:${codigo}#${desdobramento}` : `codigo:${codigo}`;
  }
  return `consulta:${card.consulta.trim().toLowerCase()}`;
}

/**
 * localStorage accessor that tolerates SSR and privacy modes that throw on access
 * @returns Storage, or null when unavailable
 */
function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/**
 * Narrow unknown parsed JSON to a stored favorite
 * @param valor - Value from localStorage
 * @returns Whether the value is a usable favorite
 */
function isCartaoFavorito(valor: unknown): valor is CartaoFavorito {
  if (!valor || typeof valor !== 'object') return false;
  const item = valor as Partial<CartaoFavorito>;
  const card = item.card as Partial<CartaoEstruturado> | undefined;
  return (
    typeof item.id === 'string' &&
    typeof item.salvo_em === 'string' &&
    !!card &&
    typeof card === 'object' &&
    typeof card.consulta === 'string'
  );
}

/**
 * Write the list back to storage
 * @param lista - Favorites, newest first
 * @returns Whether the write succeeded
 */
function persist(lista: CartaoFavorito[]): boolean {
  const store = storage();
  if (!store) return false;

  try {
    store.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(lista.slice(0, MAX_FAVORITES)));
    return true;
  } catch (err) {
    console.error('Failed to save favorites:', err);
    return false;
  }
}

/**
 * Read the saved cards, newest first
 * @returns Favorites, skipping entries that cannot be read
 */
export function getFavorites(): CartaoFavorito[] {
  const store = storage();
  if (!store) return [];

  try {
    const raw = store.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isCartaoFavorito);
  } catch (err) {
    console.error('Failed to read favorites:', err);
    return [];
  }
}

/**
 * Check whether a card is already saved
 * @param card - Card to look up
 * @returns Whether the card is a favorite
 */
export function isFavorite(card: CartaoEstruturado): boolean {
  const id = favoriteId(card);
  return getFavorites().some((item) => item.id === id);
}

/**
 * Save the card when it is not saved, remove it when it is
 * @param card - Card to toggle
 * @returns Whether the card ended up saved
 */
export function toggleFavorite(card: CartaoEstruturado): boolean {
  const id = favoriteId(card);
  const atual = getFavorites();
  const restante = atual.filter((item) => item.id !== id);

  if (restante.length !== atual.length) {
    persist(restante);
    return false;
  }

  const novo: CartaoFavorito = { id, salvo_em: new Date().toISOString(), card };
  return persist([novo, ...restante]);
}

/**
 * Drop a single favorite
 * @param id - Favorite id
 */
export function removeFavorite(id: string): void {
  persist(getFavorites().filter((item) => item.id !== id));
}

/** Drop every favorite stored on this device. */
export function clearFavorites(): void {
  const store = storage();
  if (!store) return;

  try {
    store.removeItem(FAVORITES_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear favorites:', err);
  }
}
