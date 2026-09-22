'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsultaForm from '@/components/ConsultaForm';
import RecentQueries from '@/components/RecentQueries';

export default function Home() {
  const [showForm, setShowForm] = useState(false);

  // "Nova consulta" chega aqui como /?form=1 e abre o formulário direto,
  // sem obrigar o agente a passar pela tela de abertura.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('form') === '1') {
      setShowForm(true);
    }
  }, []);

  if (showForm) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-2xl mx-auto py-12">
          <div className="mb-8">
            <Link href="/" onClick={() => setShowForm(false)} className="inline-block py-2 text-ctb-green hover:text-opacity-80 font-semibold sm:py-0">
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

            <ConsultaForm autoFocus={true} />
            <RecentQueries />

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
          className="inline-block bg-ctb-green hover:bg-opacity-90 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
        >
          Iniciar Consulta
        </button>

        <div className="mt-16 text-sm text-gray-600 dark:text-gray-400">
          <p className="mb-4">Para agentes de trânsito (PM, PC, PRF, polícia municipal)</p>
          <ul className="space-y-1">
            <li>Consulta por código MBFT, artigo ou situação descrita</li>
            <li>Dossiê temático em PDF para levar para a rua</li>
            <li>Ditado por voz e modo sol (alto contraste)</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
