import type { useState } from 'react';

/**
 * Exemplo de card com o novo design system.
 * Borda #BDD3C5, border-radius 12-16px, sombras suaves.
 */
export default function DemoCards() {
  return (
    <div className="container-centro space-y-8">
      <h1 className="titulo-secundario text-center">Cards — Design System</h1>

      {/* Card padrão */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <div className="card card-pad">
          <h3 className="card-title">Card Institucional</h3>
          <p className="mt-3 text-sm text-muted leading-relaxed">
            Este card usa a paleta primária, bordas em <span className="font-semibold text-ink-strong">#BDD3C5</span>
            e cantos arredondados de 12px. Fundo #FFFFFF, texto em verde escuro.
          </p>
          <div className="mt-4 flex gap-2">
            <button className="btn-primary btn-sm">Conhecer</button>
            <button className="btn-secondary btn-sm">Ignorar</button>
          </div>
        </div>

        {/* Card com header destacado */}
        <div className="card card-pad" style={{ borderTop: '4px solid rgb(var(--primary-accent))' }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary-accent">Destaque</p>
              <h3 className="mt-1 text-lg font-bold uppercase text-ink-strong">Procedimento POP</h3>
              <p className="mt-2 text-sm text-muted">
                Parada veicular — art. 165 et seq. do CTB.
              </p>
            </div>
            <span className="chip chip-accent shrink-0">Ativo</span>
          </div>
        </div>

        {/* Card somente ícone */}
        <div className="card flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary-soft text-primary">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase text-ink-strong">Segurança</h3>
            <p className="text-xs text-muted">Verificado e assinado.</p>
          </div>
        </div>
      </div>

      {/* Card estendido */}
      <div className="card card-pad">
        <h3 className="card-title">Dados da Infração</h3>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Código MBFT</dt>
            <dd className="mt-0.5 text-lg font-bold text-ink-strong">517-2017</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Gravidade</dt>
            <dd className="mt-0.5">
              <span className="chip chip-primary">Grave</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Multa</dt>
            <dd className="mt-0.5 text-lg font-bold text-danger">R$ 295,11</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-muted">Pontos</dt>
            <dd className="mt-0.5 text-lg font-bold text-ink-strong">5</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
