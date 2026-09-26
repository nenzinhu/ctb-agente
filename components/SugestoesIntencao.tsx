'use client';

import { useMemo } from 'react';
import { detectarIntencoes } from '@/lib/search/intencoes';

interface Props {
  texto: string;
  /** Runs the consultation for the chosen MBFT code. */
  onEscolher: (codigo: string) => void;
}

/**
 * "Você quis dizer?" while the agent types: related infractions for the slang
 * or initials used, each with a plain example. Local data, answers instantly.
 */
export default function SugestoesIntencao({ texto, onEscolher }: Props) {
  const intencoes = useMemo(() => detectarIntencoes(texto), [texto]);
  if (intencoes.length === 0) return null;

  return (
    <section aria-label="Você quis dizer" aria-live="polite" className="space-y-3">
      {intencoes.map((intencao) => (
        <div key={intencao.id} className="rounded-control border border-ds-line bg-ds-muted p-3">
          <p className="label mb-1">Você quis dizer: {intencao.titulo}?</p>
          <p className="text-sm text-ds-subtle">
            <span className="font-semibold text-ds-text">Explicando fácil: </span>
            {intencao.exemplo}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {intencao.opcoes.map((opcao) => (
              <button key={opcao.codigo} type="button" className="chip" onClick={() => onEscolher(opcao.codigo)}>
                <span className="font-mono text-xs font-bold">{opcao.codigo}</span> {opcao.rotulo}
              </button>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
