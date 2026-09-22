'use client';

import { useState } from 'react';
import { CartaoEstruturado } from '@/lib/response/response-types';
import CartaoTecnico from './CartaoTecnico';
import CartaoSimples from './CartaoSimples';
import CitacaoEvidencia from './CitacaoEvidencia';

interface ConsultaResultProps {
  card: CartaoEstruturado;
}

export default function ConsultaResult({ card }: ConsultaResultProps) {
  const [view, setView] = useState<'tecnico' | 'simples'>('tecnico');

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex gap-2 mb-8 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setView('tecnico')}
          className={`px-4 py-2 font-semibold transition-colors ${
            view === 'tecnico'
              ? 'text-ctb-green border-b-2 border-ctb-green'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Técnico
        </button>
        <button
          onClick={() => setView('simples')}
          className={`px-4 py-2 font-semibold transition-colors ${
            view === 'simples'
              ? 'text-ctb-green border-b-2 border-ctb-green'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Em Palavras Simples
        </button>
      </div>

      {view === 'tecnico' && (
        <div className="space-y-8">
          <CartaoTecnico card={card} />
          {card.checklist_ait && card.checklist_ait.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                ✅ Checklist do AIT
              </h3>
              <ul className="space-y-2">
                {card.checklist_ait.map((item, idx) => (
                  <li key={idx} className="text-gray-700 dark:text-gray-300 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {card.erros_comuns && card.erros_comuns.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">
                ❌ Erros Comuns
              </h3>
              <ul className="space-y-2">
                {card.erros_comuns.map((item, idx) => (
                  <li key={idx} className="text-gray-700 dark:text-gray-300 text-sm">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}

      {view === 'simples' && (
        <div className="space-y-8">
          <CartaoSimples card={card} />
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}
    </div>
  );
}
