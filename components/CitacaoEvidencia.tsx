'use client';

import { useState } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';

interface CitacaoEvidenciaProps {
  citacoes: CartaoEstruturado['citacoes'];
}

export default function CitacaoEvidencia({ citacoes }: CitacaoEvidenciaProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!citacoes || citacoes.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
      <h3 className="font-bold text-gray-900 dark:text-white mb-4">
        📋 Fontes e Citações
      </h3>

      <div className="space-y-3">
        {citacoes.map((cit, idx) => (
          <div
            key={idx}
            className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === idx.toString() ? null : idx.toString())}
              className="w-full px-4 py-3 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <div className="text-left">
                <p className="font-mono text-sm text-ctb-green">
                  {cit.dispositivo}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {cit.validada ? '✅ Validada' : '⚠️ Não verificada'}
                </p>
              </div>
              <span className="text-gray-400">
                {expanded === idx.toString() ? '−' : '+'}
              </span>
            </button>

            {expanded === idx.toString() && (
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-t border-gray-200 dark:border-gray-600">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  "{cit.trecho}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
