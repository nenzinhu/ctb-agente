'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CartaoEstruturado } from '@/lib/response/response-types';
import CartaoTecnico from './CartaoTecnico';
import CartaoSimples from './CartaoSimples';
import CitacaoEvidencia from './CitacaoEvidencia';
import NormasAplicaveis from './NormasAplicaveis';
import JurisprudenciaBloco from './JurisprudenciaBloco';
import BotoesCartao from './BotoesCartao';

interface ConsultaResultProps {
  card: CartaoEstruturado;
}

export default function ConsultaResult({ card }: ConsultaResultProps) {
  const [view, setView] = useState<'tecnico' | 'simples'>('tecnico');

  if (!card.sucesso) {
    return (
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-amber-50 dark:bg-amber-900 border-l-4 border-amber-500 p-6 rounded">
          <h2 className="font-bold text-amber-900 dark:text-amber-100 text-lg">
            Nada encontrado na base
          </h2>
          <p className="text-amber-900 dark:text-amber-100 text-sm mt-2">
            {card.explicacao_simples ||
              'A base ainda não tem conteúdo para esta consulta.'}
          </p>
          <ul className="text-sm text-amber-900 dark:text-amber-100 mt-4 space-y-1">
            <li>• Confira o código (ex.: 516-91) ou o artigo (ex.: art. 165)</li>
            <li>• Descreva a situação com mais detalhes</li>
            <li>• Peça ao master para cadastrar o documento no painel</li>
          </ul>
          <Link
            href="/?form=1"
            className="inline-block mt-4 bg-ctb-green text-white font-semibold px-5 py-2 rounded-lg hover:bg-ctb-green/90"
          >
            Fazer nova consulta
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        {card.cache_hit && (
          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
            ⚡ Resposta do cache (base inalterada)
          </p>
        )}

        <div className="ml-auto">
          <BotoesCartao card={card} />
        </div>
      </div>

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
          <NormasAplicaveis normas={card.normas} />

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

          <JurisprudenciaBloco decisoes={card.jurisprudencia} />
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}

      {view === 'simples' && (
        <div className="space-y-8">
          <CartaoSimples card={card} />
          <JurisprudenciaBloco decisoes={card.jurisprudencia} />
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}
    </div>
  );
}
