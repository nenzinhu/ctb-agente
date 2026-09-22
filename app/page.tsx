'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [showForm, setShowForm] = useState(false);

  if (showForm) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto py-12">
          <div className="mb-8">
            <Link href="/" onClick={() => setShowForm(false)} className="text-green-600 hover:text-green-700 font-semibold">
              ← Voltar
            </Link>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Consulta CTB
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Digite um código de infração, número de artigo ou descreva a situação
            </p>

            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sua consulta
                </label>
                <textarea
                  placeholder="Ex: 516-91 ou art. 165 ou dirigir acima do limite de velocidade"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  rows={4}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Consultar
              </button>
            </form>

            <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                ℹ️ Informações
              </h2>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>• <strong>Código MBFT:</strong> 516-91 (código de infração)</li>
                <li>• <strong>Artigo CTB:</strong> art. 165 (legislação específica)</li>
                <li>• <strong>Situação:</strong> descrição da infração ou conduta</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
          CTB Agente
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
          Consulta legislação de trânsito brasileira com IA
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mb-12 max-w-md">
          Responde com precisão cirúrgica sobre infrações, artigos, enquadramentos e jurisprudência
        </p>

        <button
          onClick={() => setShowForm(true)}
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Iniciar Consulta
        </button>

        <div className="mt-16 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-4">Para agentes de trânsito (PM, PC, PRF, polícia municipal)</p>
          <p>⚠️ App em desenvolvimento - Fase 2/7 completa</p>
        </div>
      </div>
    </main>
  );
}
