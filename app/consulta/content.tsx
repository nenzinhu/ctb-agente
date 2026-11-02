'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ConsultaResult from '@/components/ConsultaResult';
import { ETAPAS_CONSULTA } from '@/components/etapas';
import Icone from '@/components/ui/Icone';
import Stepper from '@/components/ui/Stepper';
import TitleCard from '@/components/ui/TitleCard';
import { requestJson, RequestError } from '@/lib/client/request';
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
  const [tentativa, setTentativa] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const query = searchParams.get('q');

  useEffect(() => {
    if (!query) return;

    const controller = new AbortController();
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
        const data = await requestJson<{ card?: CartaoEstruturado }>('/api/consulta', {
          signal: controller.signal,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consulta: query, turnstileToken }),
        });

        if (!data || !data.card || typeof data.card.sucesso !== 'boolean') {
          throw new RequestError('invalid-response', 'O serviço retornou uma resposta inválida. Tente novamente.');
        }
        if (controller.signal.aborted) return;
        setResult(data.card ?? null);
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchResult();
    return () => controller.abort();
  }, [query, tentativa]);

  // Sem consulta na URL não há o que buscar: sem isso a página ficava em branco.
  if (!query) {
    return (
      <main className="page-narrow">
        <VoltarLink />
        <TitleCard titulo="Resultado da Consulta" icone="lista" />

        <div className="alert-warn mt-6">
          <Icone nome="info" className="mt-0.5 shrink-0 text-ds-warn" />
          <div>
            <h2 className="font-semibold">Informe uma consulta</h2>
            <p className="mt-1 text-ds-subtle">
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

      <TitleCard titulo="Resultado da Consulta" icone="lista">
        <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-ds-subtle">
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.08em]">Busca:</span>
          <span className="min-w-0 break-all rounded-lg border border-ds-line bg-ds-muted px-2.5 py-1 font-mono text-ds-text">
            {resumoConsulta(query)}
          </span>
        </p>
      </TitleCard>

      <Stepper etapas={ETAPAS_CONSULTA} atual={1} rotulo="Etapas da consulta" className="mt-6 print:hidden" />

      {loading && <CarregandoResultado />}

      {error && (
        <div className="alert-error mt-6" role="alert">
          <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
          <div>
            <p className="font-semibold">Erro</p>
            <p className="mt-1 text-ds-subtle">{error}</p>
            <button type="button" className="btn-secondary mt-3" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button>
            <p className="mt-3 text-sm"><a href="https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm" target="_blank" rel="noopener noreferrer" className="underline">Consultar o CTB no Planalto (abre em nova aba)</a> e conferir a fonte vigente antes de agir.</p>
            <Link href="/?form=1" className="mt-3 inline-block font-semibold text-ds-ink underline">
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
    <Link href="/?form=1" className="btn-ghost btn-sm -ml-2 mb-4 print:hidden">
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
