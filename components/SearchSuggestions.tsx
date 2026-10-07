'use client';

import { useEffect, useState } from 'react';
import type { FonteSugestao, SugestaoBusca } from '@/lib/search/sugestoes';

interface Props {
  query: string;
  fonte: FonteSugestao;
  disabled?: boolean;
  onSelect: (valor: string) => void;
}

/** Visible typeahead rows; intentionally not a select/dropdown so alternatives
 * can be read and compared before the agent chooses one. */
export default function SearchSuggestions({ query, fonte, disabled = false, onSelect }: Props) {
  const [sugestoes, setSugestoes] = useState<SugestaoBusca[]>([]);

  useEffect(() => {
    const texto = query.trim();
    if (texto.length < 3 || disabled) {
      setSugestoes([]);
      return undefined;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const resposta = await fetch(`/api/sugestoes?fonte=${fonte}&q=${encodeURIComponent(texto)}`, { signal: controller.signal });
        const corpo = await resposta.json();
        setSugestoes(resposta.ok && Array.isArray(corpo.sugestoes) ? corpo.sugestoes : []);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) setSugestoes([]);
      }
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [disabled, fonte, query]);

  if (sugestoes.length === 0) return null;

  return (
    <section className="mt-3" aria-label="Sugestões enquanto você digita">
      <p className="mb-2 text-xs font-semibold text-ds-subtle">Sugestões encontradas</p>
      <div className="space-y-2">
        {sugestoes.map((sugestao) => (
          <button
            key={`${sugestao.tipo}-${sugestao.valor}`}
            type="button"
            className="block w-full rounded-lg border border-ds-line bg-ds-surface p-3 text-left transition-colors hover:border-ds-primary hover:bg-ds-primary-soft"
            disabled={disabled}
            onClick={() => {
              setSugestoes([]);
              onSelect(sugestao.valor);
            }}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className="badge-neutral">{sugestao.tipo}</span>
              <span className="font-semibold text-ds-text">{sugestao.titulo}</span>
            </span>
            <span className="mt-1 block text-xs text-ds-subtle">{sugestao.detalhe}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
