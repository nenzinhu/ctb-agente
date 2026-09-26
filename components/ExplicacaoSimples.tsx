'use client';

import { useState } from 'react';
import RespostaFormatada from './pop/RespostaFormatada';
import Icone from './ui/Icone';

interface Explicacao {
  texto: string;
  modelo: string;
}

/**
 * "Explicar em linguagem simples": asks the AI for a lay explanation of an
 * official MBFT sheet or POP, with everyday examples. Generated on demand.
 */
export default function ExplicacaoSimples({ tipo, id }: { tipo: 'ficha' | 'pop'; id: string }) {
  const [estado, setEstado] = useState<'inicio' | 'carregando' | 'pronto' | 'erro'>('inicio');
  const [explicacao, setExplicacao] = useState<Explicacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const pedir = async () => {
    setEstado('carregando');
    setErro(null);
    try {
      const resposta = await fetch('/api/explicar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, id }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.message || 'Não foi possível gerar a explicação.');
      setExplicacao(corpo as Explicacao);
      setEstado('pronto');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
      setEstado('erro');
    }
  };

  return (
    <section className="rounded-control border-2 border-ds-ink p-4 print:hidden" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.08em] text-ds-text sm:text-sm">
          <Icone nome="info" tamanho={16} className="shrink-0 text-ds-ink" />
          Exemplo prático, em linguagem simples
        </h3>
        {estado !== 'pronto' && (
          <button type="button" className="btn-secondary btn-sm" onClick={pedir} disabled={estado === 'carregando'} aria-busy={estado === 'carregando' || undefined}>
            <Icone nome="faisca" tamanho={16} />
            {estado === 'carregando' ? 'Explicando…' : estado === 'erro' ? 'Tentar de novo' : 'Explicar'}
          </button>
        )}
      </div>

      {estado === 'inicio' && (
        <p className="mt-2 text-sm text-ds-subtle">
          Explicação para quem não é da área, com exemplos do dia a dia sobre esta {tipo === 'ficha' ? 'infração' : 'situação'}.
        </p>
      )}
      {estado === 'carregando' && (
        <div className="mt-3 space-y-2" role="status">
          <span className="sr-only">Gerando a explicação…</span>
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      )}
      {estado === 'erro' && erro && (
        <p className="field-error" role="alert">
          {erro}
        </p>
      )}
      {estado === 'pronto' && explicacao && (
        <div className="mt-3">
          <RespostaFormatada texto={explicacao.texto} />
          <p className="mt-3 border-t border-ds-line pt-2 text-xs text-ds-subtle">
            Texto didático gerado por IA ({explicacao.modelo}) a partir do texto oficial. Não substitui o{' '}
            {tipo === 'ficha' ? 'MBFT' : 'POP'}.
          </p>
        </div>
      )}
    </section>
  );
}
