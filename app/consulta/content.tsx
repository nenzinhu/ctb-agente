'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsultaResult from '@/components/ConsultaResult';
import { CartaoEstruturado } from '@/lib/response/response-types';

export default function ConsultaPageContent() {
  const searchParams = useSearchParams();
  const [result, setResult] = useState<CartaoEstruturado | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q');

  useEffect(() => {
    if (!query) return;

    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consulta: query }),
        });

        if (!response.ok) {
          throw new Error('Erro ao buscar resultado');
        }

        const data = await response.json();
        setResult(data.card || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [query]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Link href="/" className="text-ctb-green hover:text-opacity-80 font-semibold mb-4 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Resultado da Consulta
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Busca: <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
            {query}
          </span>
        </p>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin">⏳</div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Buscando informações...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 dark:bg-red-900 border-l-4 border-red-500 p-6 rounded">
            <p className="font-bold text-red-900 dark:text-red-100">Erro</p>
            <p className="text-red-800 dark:text-red-200 text-sm mt-2">{error}</p>
          </div>
        )}

        {result && <ConsultaResult card={result} />}
      </div>
    </main>
  );
}
