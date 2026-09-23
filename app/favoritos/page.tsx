'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import BotoesCartao from '@/components/BotoesCartao';
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
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="mx-auto max-w-4xl py-8">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Favoritos</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Cartões salvos neste aparelho. Nada é enviado para o servidor.
            </p>
          </div>

          {favoritos && favoritos.length > 0 && (
            <button
              type="button"
              onClick={limpar}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              Limpar tudo
            </button>
          )}
        </div>

        {favoritos === null && (
          <p className="py-12 text-center text-gray-500 dark:text-gray-400">Carregando…</p>
        )}

        {favoritos && favoritos.length === 0 && (
          <div className="rounded border-l-4 border-amber-500 bg-amber-50 p-6 dark:bg-amber-900">
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">
              Nenhum favorito ainda
            </h2>
            <p className="mt-2 text-sm text-amber-900 dark:text-amber-100">
              Depois de uma consulta, toque em “☆ Salvar” para guardar o cartão e encontrá-lo aqui.
            </p>
            <Link
              href="/?form=1"
              className="mt-4 inline-block rounded-lg bg-ctb-green px-5 py-2 font-semibold text-white hover:bg-ctb-green/90"
            >
              Fazer uma consulta
            </Link>
          </div>
        )}

        <ul className="space-y-4">
          {favoritos?.map(({ id, card, salvo_em }) => (
            <li
              key={id}
              className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800"
            >
              <Link
                href={`/consulta?q=${encodeURIComponent(card.consulta)}`}
                className="block hover:underline"
              >
                <h2 className="text-lg font-bold text-ctb-green">
                  {card.enquadramento?.descricao ?? card.consulta}
                </h2>
              </Link>

              {card.enquadramento && (
                <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <dt className="inline text-gray-500 dark:text-gray-400">Código: </dt>
                    <dd className="inline font-mono font-semibold">
                      {card.enquadramento.codigo_mbft}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-gray-500 dark:text-gray-400">Gravidade: </dt>
                    <dd className="inline font-semibold">
                      {card.enquadramento.gravidade.toUpperCase()}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-gray-500 dark:text-gray-400">Pontos: </dt>
                    <dd className="inline font-semibold">{card.enquadramento.pontos}</dd>
                  </div>
                  <div>
                    <dt className="inline text-gray-500 dark:text-gray-400">Multa: </dt>
                    <dd className="inline font-semibold">
                      {formatarMulta(card.enquadramento.valor_multa)}
                    </dd>
                  </div>
                </dl>
              )}

              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Salvo em {formatarData(salvo_em)} · busca: {card.consulta}
              </p>

              <div className="mt-4">
                <BotoesCartao card={card} onChange={atualizar} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
