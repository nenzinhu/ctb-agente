'use client';

import type { Jurisprudencia } from '@/lib/db/schema';
import Icone from './ui/Icone';

interface JurisprudenciaBlocoProps {
  decisoes: Jurisprudencia[];
}

/**
 * Shows only decisions registered in the database.
 * When the base has nothing, it says so instead of letting the UI imply there is case law.
 */
export default function JurisprudenciaBloco({ decisoes }: JurisprudenciaBlocoProps) {
  const lista = decisoes ?? [];

  return (
    <section className="card card-pad" aria-labelledby="jurisprudencia">
      <h3 id="jurisprudencia" className="section-title">
        <Icone nome="balanca" tamanho={18} className="text-ds-primary" />
        Jurisprudência
      </h3>

      {lista.length === 0 ? (
        <p className="mt-2 text-sm text-ds-subtle">
          Nenhuma decisão cadastrada para este tema. O painel master pode cadastrar decisões
          para enriquecer as próximas consultas.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {lista.map((decisao) => (
            <li key={decisao.id ?? decisao.numero} className="border-l-4 border-ds-primary pl-4">
              <p className="text-sm font-semibold text-ds-text">
                {decisao.tipo?.toUpperCase()} · {decisao.numero}
              </p>
              <p className="mt-1 text-sm text-ds-text">{decisao.resumo || decisao.ementa}</p>
              <p className="mt-1 text-xs text-ds-subtle">
                {decisao.data_decisao ? `Decisão de ${formatarData(decisao.data_decisao)}` : ''}
                {decisao.tema ? ` · Tema: ${decisao.tema}` : ''}
              </p>
              {decisao.link_oficial && (
                <a
                  href={decisao.link_oficial}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-ds-primary underline"
                >
                  Ver inteiro teor
                  <Icone nome="seta" tamanho={12} />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Format an ISO date as dd/mm/aaaa without depending on locale availability
 * @param iso - ISO date string
 * @returns Formatted date
 */
function formatarData(iso: string): string {
  const partes = String(iso).slice(0, 10).split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : String(iso);
}
