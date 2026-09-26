'use client';

import { useEffect, useState } from 'react';
import type { FonteAgrupada, RespostaPop } from '@/lib/rag/pop';
import { agruparFontesPorPop } from '@/lib/rag/pop';
import TurnstileWidget, { turnstileConfigurado } from '../TurnstileWidget';
import BotaoVoz from '../BotaoVoz';
import Icone from '../ui/Icone';
import RespostaFormatada from './RespostaFormatada';

const EXEMPLOS = [
  'Como fazer a busca pessoal?',
  'Quando é permitido o uso de algemas?',
  'Procedimento em acidente de trânsito com vítima',
  'Quando usar o taser?',
];

// Per-device preference: whether the AI organizes the answer.
const CHAVE_IA = 'ctb-pop-ia';

function lerPreferenciaIa(): boolean {
  try {
    return localStorage.getItem(CHAVE_IA) !== 'nao';
  } catch {
    return true;
  }
}

function Fonte({ fonte }: { fonte: FonteAgrupada }) {
  const [aberta, setAberta] = useState(false);
  const longo = fonte.texto.length > 320;
  return (
    <li id={`fonte-${fonte.n}`} className="scroll-mt-24 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-xs font-bold text-brand">
          {fonte.n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{fonte.local || 'Trecho do documento'}</p>
          <p className={`mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink ${!aberta && longo ? 'line-clamp-5' : ''}`}>
            {fonte.texto}
          </p>
          {longo && (
            <button type="button" className="mt-1 text-xs font-semibold text-brand underline" onClick={() => setAberta(!aberta)}>
              {aberta ? 'Mostrar menos' : 'Ver trecho completo'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/**
 * Ask the POP-PMSC base: the excerpts are always shown, grouped by POP;
 * with the AI switched on (default) it organizes them into an answer that
 * cites each one.
 */
export default function PopConsulta() {
  const [pergunta, setPergunta] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [comIa, setComIa] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespostaPop | null>(null);

  useEffect(() => {
    setComIa(lerPreferenciaIa());
  }, []);

  const alternarIa = () => {
    const novo = !comIa;
    setComIa(novo);
    try {
      localStorage.setItem(CHAVE_IA, novo ? 'sim' : 'nao');
    } catch {
      // Storage unavailable: the choice holds for this visit
    }
  };

  const perguntar = async (entrada: string) => {
    const texto = entrada.trim();
    if (texto.length < 3) return;
    if (turnstileConfigurado && !token) {
      setErro('Aguarde a verificação anti-bot e tente novamente.');
      return;
    }

    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const resposta = await fetch('/api/pop/consulta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto, turnstileToken: token ?? undefined, ia: comIa }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.message || 'Não foi possível consultar os POPs.');
      setResultado(corpo as RespostaPop);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setCarregando(false);
    }
  };

  const grupos = resultado ? agruparFontesPorPop(resultado.fontes) : [];

  return (
    <div className="space-y-5">
      <form
        className="card card-pad space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void perguntar(pergunta);
        }}
      >
        <label htmlFor="pergunta-pop" className="label">
          Sua pergunta sobre os POPs
        </label>
        <textarea
          id="pergunta-pop"
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void perguntar(pergunta);
            }
          }}
          rows={3}
          maxLength={500}
          enterKeyHint="search"
          placeholder="Ex: Qual a sequência de ações na abordagem a veículo suspeito?"
          className="input min-h-[96px] resize-none text-base"
        />

        <button
          type="button"
          role="switch"
          aria-checked={comIa}
          onClick={alternarIa}
          className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left transition-colors hover:bg-surface-2"
        >
          <span
            aria-hidden
            className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors ${comIa ? 'bg-brand' : 'bg-line'}`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-surface shadow transition-transform ${comIa ? 'translate-x-[18px]' : 'translate-x-0.5'}`}
            />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-ink">Resposta organizada por IA</span>
            <span className="block text-xs text-muted">
              {comIa
                ? 'Resumo, passo a passo, atenção e base legal, citando cada trecho.'
                : 'Desligada: só os trechos dos POPs, mais rápido.'}
            </span>
          </span>
        </button>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="submit" className="btn-primary flex-1 text-base" disabled={carregando || pergunta.trim().length < 3}>
            <Icone nome="busca" tamanho={18} />
            {carregando ? 'Consultando os POPs…' : 'Perguntar'}
          </button>
          <BotaoVoz onTranscricao={(t) => setPergunta((atual) => (atual ? `${atual} ${t}` : t))} />
        </div>
        <TurnstileWidget onToken={setToken} />
        <div className="flex flex-wrap gap-2 pt-1">
          {EXEMPLOS.map((exemplo) => (
            <button
              key={exemplo}
              type="button"
              className="chip"
              onClick={() => {
                setPergunta(exemplo);
                void perguntar(exemplo);
              }}
            >
              {exemplo}
            </button>
          ))}
        </div>
      </form>

      {carregando && (
        <div className="card card-pad space-y-3" role="status" aria-live="polite">
          <span className="sr-only">Consultando os POPs…</span>
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      )}

      {erro && (
        <div className="alert-error" role="alert">
          <Icone nome="alerta" className="mt-0.5 shrink-0 text-danger" />
          <p>{erro}</p>
        </div>
      )}

      {resultado && (
        <div className="space-y-5">
          {resultado.resposta && !resultado.semResposta && (
            <section className="card card-pad" aria-labelledby="resposta-pop">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="resposta-pop" className="section-title">
                  <Icone nome="faisca" tamanho={18} className="text-brand" />
                  Resposta
                </h2>
                <span className="badge-neutral" title={resultado.modelo ?? undefined}>
                  {resultado.cache_hit ? 'do cache' : 'organizada por IA'} a partir dos POPs
                </span>
              </div>
              <div className="mt-4">
                <RespostaFormatada texto={resultado.resposta} />
              </div>
              <p className="mt-4 flex items-start gap-1.5 border-t border-line pt-3 text-xs text-muted">
                <Icone nome="info" tamanho={14} className="mt-0.5 shrink-0" />
                Texto gerado automaticamente com base nos trechos abaixo. Confira sempre a fonte antes de agir.
              </p>
            </section>
          )}

          {resultado.semResposta && (
            <div className="alert-warn">
              <Icone nome="busca" className="mt-0.5 shrink-0 text-warn" />
              <div>
                <p className="font-semibold">Não encontrei isso nos POPs indexados.</p>
                <p className="mt-1 text-muted">
                  Tente outras palavras (ex.: o nome do procedimento) ou peça ao master para anexar o POP correspondente.
                </p>
              </div>
            </div>
          )}

          {resultado.aviso && (
            <div className="alert-info">
              <Icone nome="info" className="mt-0.5 shrink-0 text-info" />
              <p>{resultado.aviso}</p>
            </div>
          )}

          {grupos.length > 0 && (
            <section aria-labelledby="fontes-pop">
              <h2 id="fontes-pop" className="section-title">
                <Icone nome="lista" tamanho={18} className="text-brand" />
                Trechos dos POPs ({resultado.fontes.length})
              </h2>
              <div className="mt-3 space-y-4">
                {grupos.map((grupo) => (
                  <article key={grupo.pop} className="card overflow-hidden">
                    <h3 className="flex items-start gap-2 border-b border-line bg-brand-soft/50 px-4 py-3 text-sm font-semibold leading-snug text-ink">
                      <Icone nome="escudo" tamanho={17} className="mt-0.5 shrink-0 text-brand" />
                      {grupo.pop}
                    </h3>
                    <ol className="divide-y divide-line">
                      {grupo.fontes.map((fonte) => (
                        <Fonte key={fonte.n} fonte={fonte} />
                      ))}
                    </ol>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
