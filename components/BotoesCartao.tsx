'use client';

import { useEffect, useState } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { formatarCartaoParaTexto, linkDoCartao } from '@/lib/share/card';
import { compartilharTexto, type ResultadoCompartilhamento } from '@/lib/share/send';
import { isFavorite, toggleFavorite } from '@/lib/favorites/favorites';
import Icone from './ui/Icone';

/** Message shown after sharing. `null` means there is nothing worth saying. */
const AVISO_COMPARTILHAR: Record<ResultadoCompartilhamento, string | null> = {
  compartilhado: 'Cartão compartilhado.',
  copiado: 'Cartão copiado para a área de transferência.',
  cancelado: null,
  indisponivel: 'Este navegador não permite compartilhar. Copie o link manualmente.',
  falhou: 'Não foi possível compartilhar o cartão.',
};

interface BotoesCartaoProps {
  card: CartaoEstruturado;
  /** Called after the card was saved or removed on this device. */
  onChange?: () => void;
}

/**
 * Save and share actions for a result card.
 * Saving is device-local; sharing is delegated to `lib/share/send`, so this
 * component only owns the button state and the wording of the feedback.
 */
export default function BotoesCartao({ card, onChange }: BotoesCartaoProps) {
  const [favorito, setFavorito] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  // Favorites live in localStorage, which does not exist while server rendering,
  // so the button settles on mount instead of during render.
  useEffect(() => {
    setFavorito(isFavorite(card));
  }, [card]);

  const alternarFavorito = () => {
    const resultado = toggleFavorite(card);

    if (resultado === 'falhou') {
      // The storage refused the write, so re-read it instead of guessing.
      setFavorito(isFavorite(card));
      setAviso('Não foi possível salvar no aparelho.');
      return;
    }

    setFavorito(resultado === 'salvo');
    setAviso(
      resultado === 'salvo'
        ? 'Salvo nos favoritos deste aparelho.'
        : 'Removido dos favoritos.'
    );
    onChange?.();
  };

  const compartilhar = async () => {
    const link = linkDoCartao(card, window.location.origin);
    const resultado = await compartilharTexto(
      formatarCartaoParaTexto(card, link),
      'CTB Agente'
    );

    const mensagem = AVISO_COMPARTILHAR[resultado];
    if (mensagem) setAviso(mensagem);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={alternarFavorito}
        aria-pressed={favorito}
        title="Salva o cartão neste aparelho"
        className={favorito ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
      >
        <Icone nome="estrela" tamanho={16} className={favorito ? 'fill-current' : ''} />
        {favorito ? 'Salvo' : 'Salvar'}
      </button>

      <button type="button" onClick={compartilhar} title="Compartilhar o cartão" className="btn-secondary btn-sm">
        <Icone nome="compartilhar" tamanho={16} />
        Compartilhar
      </button>

      <span role="status" aria-live="polite" className="text-xs text-muted">
        {aviso}
      </span>
    </div>
  );
}
