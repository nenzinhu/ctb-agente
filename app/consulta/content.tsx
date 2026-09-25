'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsultaResult from '@/components/ConsultaResult';
import Icone from '@/components/ui/Icone';
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
      <main className="page-narrow">
        <VoltarLink />
        <h1 className="page-title">Resultado da Consulta</h1>

        <div className="alert-warn mt-6">
          <Icone nome="info" className="mt-0.5 shrink-0 text-warn" />
          <div>
            <h2 className="font-semibold">Informe uma consulta</h2>
            <p className="mt-1 text-muted">
              Digite um código de infração (ex.: 516-91), um artigo (ex.: art. 165) ou descreva a
              situação para receber o enquadramento.
            </p>
            <Link href="/?form=1" className="btn-primary mt-4">
              Fazer uma consulta
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page-narrow">
      <VoltarLink />

      <h1 className="page-title">Resultado da Consulta</h1>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
        Busca:
        <span className="rounded-lg bg-surface-2 px-2.5 py-1 font-mono text-ink break-all">{resumoConsulta(query)}</span>
      </p>

      {loading && <CarregandoResultado />}

      {error && (
        <div className="alert-error mt-6" role="alert">
          <Icone nome="alerta" className="mt-0.5 shrink-0 text-danger" />
          <div>
            <p className="font-semibold">Erro</p>
            <p className="mt-1 text-muted">{error}</p>
            <Link href="/?form=1" className="mt-3 inline-block font-semibold text-brand underline">
              Fazer nova consulta
            </Link>
          </div>
        </div>
      )}

      {result && <ConsultaResult card={result} />}
    </main>
  );
}

function VoltarLink() {
  return (
    <Link href="/?form=1" className="btn-ghost btn-sm -ml-2 mb-4">
      <Icone nome="voltar" tamanho={16} />
      Nova consulta
    </Link>
  );
}

/**
 * Placeholder with the shape of a card, so the page doesn't jump when the
 * answer arrives.
 */
function CarregandoResultado() {
  return (
    <div className="mt-6 space-y-4" role="status" aria-live="polite">
      <span className="sr-only">Buscando informações...</span>
      <div className="card card-pad space-y-4">
        <div className="skeleton h-6 w-2/3" />
        <div className="grid grid-cols-3 gap-3">
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
          <div className="skeleton h-16" />
        </div>
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-5/6" />
      </div>
      <div className="card card-pad space-y-3">
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-12 w-full" />
      </div>
    </div>
  );
}
