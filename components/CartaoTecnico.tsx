'use client';

import { CartaoEstruturado } from '@/lib/response/response-types';

interface CartaoTecnicoProps {
  card: CartaoEstruturado;
}

export default function CartaoTecnico({ card }: CartaoTecnicoProps) {
  if (!card.enquadramento) {
    return null;
  }

  const { enquadramento } = card;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border-l-4 border-ctb-green">
      <h2 className="text-2xl font-bold text-ctb-green mb-6">
        {enquadramento.descricao}
      </h2>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">Código MBFT</p>
          <p className="text-3xl font-mono font-bold text-gray-900 dark:text-white">
            {enquadramento.codigo_mbft}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400 uppercase">Gravidade</p>
          <p className={`text-xl font-bold ${
            enquadramento.gravidade === 'gravíssima' ? 'text-red-600' :
            enquadramento.gravidade === 'grave' ? 'text-orange-600' :
            enquadramento.gravidade === 'média' ? 'text-yellow-600' :
            'text-blue-600'
          }`}>
            {enquadramento.gravidade.toUpperCase()}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pontos</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {enquadramento.pontos}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Multa</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            R$ {(enquadramento.valor_multa / 100).toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Unidade</p>
          <p className="text-sm text-gray-900 dark:text-white">
            {enquadramento.unidade}
          </p>
        </div>
      </div>

      {enquadramento.retem_veiculo && (
        <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4 mb-4">
          <p className="font-semibold text-yellow-900 dark:text-yellow-100">
            ⚠️ Veículo retido
          </p>
        </div>
      )}

      {enquadramento.remove_veiculo && (
        <div className="bg-red-50 dark:bg-red-900 border-l-4 border-red-400 p-4 mb-4">
          <p className="font-semibold text-red-900 dark:text-red-100">
            🚗 Remoção obrigatória
          </p>
          {enquadramento.medida_administrativa && (
            <p className="text-sm text-red-800 dark:text-red-200 mt-1">
              {enquadramento.medida_administrativa}
            </p>
          )}
        </div>
      )}

      <div className="mt-8">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Amparo Legal</h3>
        <p className="text-gray-700 dark:text-gray-300 font-mono text-sm">
          {enquadramento.amparo_legal}
        </p>
      </div>
    </div>
  );
}
