'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsultaResult from '@/components/ConsultaResult';
import { CartaoEstruturado } from '@/lib/response/response-types';

const TURNSTILE_STORAGE_KEY = 'ctb-turnstile-token';

/**
 * Shorten the echoed query for the header.
 * The textarea accepts up to 1000 characters, and a single unbroken token of that
 * size stretched the result page thousands of pixels wide on a phone.
 * @param texto - Query from the URL
 * @param limite - Maximum characters to echo
 * @returns Query, truncated with an ellipsis when needed
 */
function resumoConsulta(texto: string, limite = 140): string {
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

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
      setResult(null);

      let turnstileToken: string | undefined;
      try {
        turnstileToken = sessionStorage.getItem(TURNSTILE_STORAGE_KEY) || undefined;
      } catch {
        turnstileToken = undefined;
      }

      try {
        const response = await fetch('/api/consulta', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consulta: query, turnstileToken }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              (response.status === 429
                ? 'Limite de consultas atingido. Tente novamente mais tarde.'
                : 'Não foi possível concluir a consulta.')
          );
        }

        setResult(data.card ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [query]);

  // Sem consulta na URL não há o que buscar: sem isso a página ficava em branco.
  if (!query) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto py-8">
          <Link
            href="/?form=1"
            className="text-ctb-green hover:text-opacity-80 font-semibold mb-4 inline-block py-2 sm:py-0"
          >
            ← Voltar
          </Link>

          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Resultado da Consulta
          </h1>

          <div className="bg-amber-50 dark:bg-amber-900 border-l-4 border-amber-500 p-6 rounded">
            <h2 className="font-bold text-amber-900 dark:text-amber-100 text-lg">
              Informe uma consulta
            </h2>
            <p className="text-amber-900 dark:text-amber-100 text-sm mt-2">
              Digite um código de infração (ex.: 516-91), um artigo (ex.: art. 165) ou descreva a
              situação para receber o enquadramento.
            </p>
            <Link
              href="/?form=1"
              className="inline-block mt-4 bg-ctb-green text-white font-semibold px-5 py-2 rounded-lg hover:bg-ctb-green/90"
            >
              Fazer uma consulta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Link
          href="/?form=1"
          className="text-ctb-green hover:text-opacity-80 font-semibold mb-4 inline-block py-2 sm:py-0"
        >
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Resultado da Consulta
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Busca:{' '}
          <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded break-all">
            {resumoConsulta(query)}
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
            <Link href="/?form=1" className="text-sm text-red-900 dark:text-red-100 underline mt-4 inline-block">
              Fazer nova consulta
            </Link>
          </div>
        )}

        {result && <ConsultaResult card={result} />}
      </div>
    </main>
  );
}
