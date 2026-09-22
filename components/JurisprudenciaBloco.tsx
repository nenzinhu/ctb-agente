'use client';

import type { Jurisprudencia } from '@/lib/db/schema';

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
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-2">⚖️ Jurisprudência</h3>

      {lista.length === 0 ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Nenhuma decisão cadastrada para este tema. O painel master pode cadastrar decisões
          para enriquecer as próximas consultas.
        </p>
      ) : (
        <ul className="space-y-4">
          {lista.map((decisao) => (
            <li
              key={decisao.id ?? decisao.numero}
              className="border-l-4 border-ctb-green pl-4"
            >
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {decisao.tipo?.toUpperCase()} · {decisao.numero}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                {decisao.resumo || decisao.ementa}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {decisao.data_decisao ? `Decisão de ${formatarData(decisao.data_decisao)}` : ''}
                {decisao.tema ? ` · Tema: ${decisao.tema}` : ''}
              </p>
              {decisao.link_oficial && (
                <a
                  href={decisao.link_oficial}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-ctb-green underline mt-1 inline-block"
                >
                  Ver inteiro teor
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
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
