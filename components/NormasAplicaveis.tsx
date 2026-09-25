'use client';

import { useState } from 'react';
import type { NormaAplicavel } from '@/lib/response/response-types';
import Icone from './ui/Icone';

interface NormasAplicaveisProps {
  normas: NormaAplicavel[];
}

/**
 * Lists the legal provisions that back the answer.
 * Shown for every query type so article lookups still have substance.
 * The first one opens expanded: it is the best match.
 */
export default function NormasAplicaveis({ normas }: NormasAplicaveisProps) {
  const [aberta, setAberta] = useState<string | null>(normas?.[0]?.numero_dispositivo ?? null);

  if (!normas || normas.length === 0) {
    return null;
  }

  return (
    <section className="card card-pad" aria-labelledby="normas-aplicaveis">
      <h3 id="normas-aplicaveis" className="section-title">
        <Icone nome="livro" tamanho={18} className="text-brand" />
        Normas aplicáveis
      </h3>

      <ul className="mt-4 space-y-2">
        {normas.map((norma) => {
          const expandida = aberta === norma.numero_dispositivo;
          return (
            <li key={norma.numero_dispositivo} className="overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setAberta(expandida ? null : norma.numero_dispositivo)}
                aria-expanded={expandida}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-sm font-semibold text-brand">{norma.numero_dispositivo}</span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {norma.tipo} · {norma.vigente ? 'vigente' : 'com vigência encerrada'}
                  </span>
                </span>
                <Icone
                  nome="chevron"
                  tamanho={18}
                  className={`shrink-0 text-muted transition-transform ${expandida ? 'rotate-180' : ''}`}
                />
              </button>

              {expandida && (
                <p className="whitespace-pre-line border-t border-line bg-surface-2 px-4 py-3 text-sm leading-relaxed text-ink">
                  {norma.texto || 'Texto não cadastrado na base.'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
