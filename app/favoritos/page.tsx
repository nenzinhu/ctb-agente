'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BotoesCartao from '@/components/BotoesCartao';
import BadgeGravidade from '@/components/ui/BadgeGravidade';
import Icone from '@/components/ui/Icone';
import { formatarMulta } from '@/lib/response/format';
import { clearFavorites, getFavorites, type CartaoFavorito } from '@/lib/favorites/favorites';

/**
 * Format the saved-at timestamp for the list
 * @param iso - ISO timestamp
 * @returns PT-BR date, or an empty string when the value is unusable
 */
function formatarData(iso: string): string {
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? '' : data.toLocaleDateString('pt-BR');
}

export default function FavoritosPage() {
  // null means "not read yet": favorites only exist in the browser, so they
  // cannot be read during server rendering.
  const [favoritos, setFavoritos] = useState<CartaoFavorito[] | null>(null);

  useEffect(() => {
    setFavoritos(getFavorites());
  }, []);

  const atualizar = () => setFavoritos(getFavorites());

  const limpar = () => {
    clearFavorites();
    setFavoritos([]);
  };

  return (
    <main className="page-narrow">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Seus cartões</p>
          <h1 className="page-title">Favoritos</h1>
          <p className="page-lead">Cartões salvos neste aparelho. Nada é enviado para o servidor.</p>
        </div>

        {favoritos && favoritos.length > 0 && (
          <button type="button" onClick={limpar} className="btn-secondary btn-sm">
            <Icone nome="lixeira" tamanho={16} />
            Limpar tudo
          </button>
        )}
      </div>

      {favoritos === null && (
        <div className="mt-6 space-y-3" role="status">
          <span className="sr-only">Carregando…</span>
          <div className="skeleton h-32" />
          <div className="skeleton h-32" />
        </div>
      )}

      {favoritos && favoritos.length === 0 && (
        <div className="card card-pad mt-6 flex flex-col items-center py-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand">
            <Icone nome="estrela" tamanho={28} />
          </span>
          <h2 className="mt-4 text-lg font-semibold text-ink">Nenhum favorito ainda</h2>
          <p className="mt-1 max-w-sm text-sm text-muted">
            Depois de uma consulta, toque em “Salvar” no cartão para guardá-lo aqui, neste aparelho.
          </p>
          <Link href="/?form=1" className="btn-primary mt-5">
            <Icone nome="busca" tamanho={18} />
            Fazer uma consulta
          </Link>
        </div>
      )}

      {favoritos && favoritos.length > 0 && (
        <ul className="mt-6 space-y-4">
          {favoritos.map(({ id, card, salvo_em }) => (
            <li key={id} className="card card-pad">
              {card.enquadramento && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="rounded-lg border border-line bg-surface-2 px-2 py-0.5 font-mono text-xs font-bold text-ink">
                    {card.enquadramento.codigo_mbft}
                  </span>
                  <BadgeGravidade gravidade={card.enquadramento.gravidade} />
                </div>
              )}

              <h2 className="text-lg font-semibold leading-snug">
                <Link
                  href={`/consulta?q=${encodeURIComponent(card.consulta)}`}
                  className="rounded text-ink hover:text-brand hover:underline"
                >
                  {card.enquadramento?.descricao ?? card.consulta}
                </Link>
              </h2>

              {card.enquadramento && (
                <dl className="mt-3 grid grid-cols-2 gap-2 sm:max-w-sm">
                  <div className="rounded-lg bg-surface-2 px-3 py-2">
                    <dt className="stat-label">Pontos</dt>
                    <dd className="font-semibold text-ink">{card.enquadramento.pontos}</dd>
                  </div>
                  <div className="rounded-lg bg-surface-2 px-3 py-2">
                    <dt className="stat-label">Multa</dt>
                    <dd className="font-semibold text-ink">{formatarMulta(card.enquadramento.valor_multa)}</dd>
                  </div>
                </dl>
              )}

              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted">
                <Icone nome="relogio" tamanho={14} className="shrink-0" />
                Salvo em {formatarData(salvo_em)} · busca: {card.consulta}
              </p>

              <div className="mt-4 border-t border-line pt-4">
                <BotoesCartao card={card} onChange={atualizar} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
