'use client';

import { useState } from 'react';
import type { NormaAplicavel } from '@/lib/response/response-types';

interface NormasAplicaveisProps {
  normas: NormaAplicavel[];
}

/**
 * Lists the legal provisions that back the answer.
 * Shown for every query type so article lookups still have substance.
 */
export default function NormasAplicaveis({ normas }: NormasAplicaveisProps) {
  const [aberta, setAberta] = useState<string | null>(null);

  if (!normas || normas.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">
        📖 Normas aplicáveis
      </h3>

      <ul className="space-y-3">
        {normas.map((norma) => {
          const expandida = aberta === norma.numero_dispositivo;
          return (
            <li
              key={norma.numero_dispositivo}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                type="button"
                onClick={() => setAberta(expandida ? null : norma.numero_dispositivo)}
                aria-expanded={expandida}
                className="w-full px-4 py-3 flex justify-between items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                <span>
                  <span className="block font-mono text-sm text-ctb-green">
                    {norma.numero_dispositivo}
                  </span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {norma.tipo} · {norma.vigente ? 'vigente' : 'com vigência encerrada'}
                  </span>
                </span>
                <span className="text-gray-400 shrink-0">{expandida ? '−' : '+'}</span>
              </button>

              {expandida && (
                <p className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-line">
                  {norma.texto || 'Texto não cadastrado na base.'}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
