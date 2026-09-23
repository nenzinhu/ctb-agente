'use client';

import { useEffect, useState } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { formatarCartaoParaTexto, linkDoCartao } from '@/lib/response/share';
import { isFavorite, toggleFavorite } from '@/lib/favorites/favorites';

interface BotoesCartaoProps {
  card: CartaoEstruturado;
  /** Called after the favorite state changes, with the new state. */
  onChange?: (favorito: boolean) => void;
}

/**
 * Save and share actions for a result card.
 * Saving is device-local; sharing uses the native share sheet when available
 * and falls back to copying the text to the clipboard.
 */
export default function BotoesCartao({ card, onChange }: BotoesCartaoProps) {
  const [favorito, setFavorito] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    setFavorito(isFavorite(card));
  }, [card]);

  const alternarFavorito = () => {
    const agora = toggleFavorite(card);
    setFavorito(agora);
    setAviso(agora ? 'Salvo nos favoritos deste aparelho.' : 'Removido dos favoritos.');
    onChange?.(agora);
  };

  const compartilhar = async () => {
    const url = linkDoCartao(card, window.location.origin);
    const texto = formatarCartaoParaTexto(card, url);

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'CTB Agente', text: texto });
        setAviso('Cartão compartilhado.');
        return;
      }

      if (typeof navigator.clipboard?.writeText !== 'function') {
        setAviso('Este navegador não permite compartilhar. Copie o link manualmente.');
        return;
      }

      await navigator.clipboard.writeText(texto);
      setAviso('Cartão copiado para a área de transferência.');
    } catch (err) {
      // Closing the native share sheet throws AbortError: not a failure.
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setAviso('Não foi possível compartilhar o cartão.');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={alternarFavorito}
        aria-pressed={favorito}
        title="Salva o cartão neste aparelho"
        className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
          favorito
            ? 'bg-ctb-green text-white hover:bg-ctb-green/90'
            : 'border border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
        }`}
      >
        {favorito ? '★ Salvo' : '☆ Salvar'}
      </button>

      <button
        type="button"
        onClick={compartilhar}
        title="Compartilhar o cartão"
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
      >
        🔗 Compartilhar
      </button>

      <span
        role="status"
        aria-live="polite"
        className="text-xs text-gray-600 dark:text-gray-400"
      >
        {aviso}
      </span>
    </div>
  );
}
