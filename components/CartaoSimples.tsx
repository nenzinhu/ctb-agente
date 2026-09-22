'use client';

import { CartaoEstruturado } from '@/lib/response/response-types';

interface CartaoSimplesProps {
  card: CartaoEstruturado;
}

export default function CartaoSimples({ card }: CartaoSimplesProps) {
  return (
    <div className="bg-gradient-to-br from-green-50 dark:from-green-900 to-white dark:to-gray-800 rounded-lg p-6">
      <h2 className="text-2xl font-bold text-ctb-green mb-4">
        Em palavras simples
      </h2>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            O que aconteceu?
          </h3>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {card.explicacao_simples}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Exemplo do dia a dia
          </h3>
          <div className="bg-white dark:bg-gray-700 p-4 rounded-lg border-l-4 border-ctb-green">
            <p className="text-gray-700 dark:text-gray-300 italic">
              {card.exemplo_dia_a_dia}
            </p>
          </div>
        </div>

        {card.crime_transito && (
          <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 p-4 rounded">
            <p className="font-bold text-red-900 dark:text-red-100">
              ⚠️ ATENÇÃO: Crime de trânsito
            </p>
            <p className="text-red-800 dark:text-red-200 text-sm mt-2">
              {typeof card.crime_transito === 'boolean'
                ? 'Esta infração pode ser enquadrada como crime de trânsito.'
                : card.crime_transito}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
