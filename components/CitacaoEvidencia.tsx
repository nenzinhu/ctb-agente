'use client';

import { useState } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';
import Icone from './ui/Icone';

interface CitacaoEvidenciaProps {
  citacoes: CartaoEstruturado['citacoes'];
}

export default function CitacaoEvidencia({ citacoes }: CitacaoEvidenciaProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  if (!citacoes || citacoes.length === 0) {
    return null;
  }

  return (
    <section className="card card-pad" aria-labelledby="fontes-citacoes">
      <h3 id="fontes-citacoes" className="section-title">
        <Icone nome="lista" tamanho={18} className="text-brand" />
        Fontes e citações
      </h3>

      <ul className="mt-4 space-y-2">
        {citacoes.map((cit, idx) => {
          const aberta = expanded === idx;
          return (
            <li key={idx} className="overflow-hidden rounded-xl border border-line">
              <button
                type="button"
                onClick={() => setExpanded(aberta ? null : idx)}
                aria-expanded={aberta}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-sm font-semibold text-brand">{cit.dispositivo}</span>
                  <span className={`mt-1 ${cit.validada ? 'badge-brand' : 'badge-media'}`}>
                    <Icone nome={cit.validada ? 'check' : 'alerta'} tamanho={12} />
                    {cit.validada ? 'Validada no texto da lei' : 'Não verificada'}
                  </span>
                </span>
                <Icone
                  nome="chevron"
                  tamanho={18}
                  className={`shrink-0 text-muted transition-transform ${aberta ? 'rotate-180' : ''}`}
                />
              </button>

              {aberta && (
                <blockquote className="border-t border-line bg-surface-2 px-4 py-3 text-sm italic leading-relaxed text-ink">
                  “{cit.trecho}”
                </blockquote>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
