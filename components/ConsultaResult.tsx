'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CartaoEstruturado } from '@/lib/response/response-types';
import CartaoTecnico from './CartaoTecnico';
import CartaoSimples from './CartaoSimples';
import CitacaoEvidencia from './CitacaoEvidencia';
import NormasAplicaveis from './NormasAplicaveis';
import JurisprudenciaBloco from './JurisprudenciaBloco';
import BotoesCartao from './BotoesCartao';
import Icone from './ui/Icone';

interface ConsultaResultProps {
  card: CartaoEstruturado;
}

/** "[ ] Fotografar…" → "Fotografar…" (the brackets were a plain-text checkbox). */
function semMarcador(item: string): string {
  return item.replace(/^\[\s?\]\s*/, '');
}

/** "❌ Não descrever…" → { texto, alerta: false } */
function erroComum(item: string): { texto: string; alerta: boolean } {
  return { texto: item.replace(/^(?:❌|⚠️|⚠)\s*/u, ''), alerta: /^(?:⚠️|⚠)/u.test(item) };
}

function ChecklistAit({ itens }: { itens: string[] }) {
  const [feitos, setFeitos] = useState<Set<number>>(new Set());
  const alternar = (i: number) =>
    setFeitos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(i)) proximo.delete(i);
      else proximo.add(i);
      return proximo;
    });

  return (
    <section className="card card-pad" aria-labelledby="checklist-ait">
      <div className="flex items-center justify-between gap-3">
        <h3 id="checklist-ait" className="section-title">
          <Icone nome="check" tamanho={18} className="text-brand" />
          Checklist do AIT
        </h3>
        <span className="badge-neutral">
          {feitos.size}/{itens.length}
        </span>
      </div>
      <ul className="mt-4 space-y-1">
        {itens.map((item, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
              <input
                type="checkbox"
                checked={feitos.has(i)}
                onChange={() => alternar(i)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-line accent-[rgb(var(--brand))]"
              />
              <span className={`text-sm ${feitos.has(i) ? 'text-muted line-through' : 'text-ink'}`}>{semMarcador(item)}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ConsultaResult({ card }: ConsultaResultProps) {
  const [view, setView] = useState<'tecnico' | 'simples'>('tecnico');

  if (!card.sucesso) {
    return (
      <div className="card card-pad mt-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-warn/10 text-warn">
            <Icone nome="busca" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ink">Nada encontrado na base</h2>
            <p className="mt-1 text-sm text-muted">
              {card.explicacao_simples || 'A base ainda não tem conteúdo para esta consulta.'}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-muted">
          <li>• Confira o código (ex.: 516-91) ou o artigo (ex.: art. 165)</li>
          <li>• Descreva a situação com mais detalhes</li>
          <li>• Peça ao master para cadastrar o documento no painel</li>
        </ul>
        <Link href="/?form=1" className="btn-primary mt-5">
          Fazer nova consulta
        </Link>
      </div>
    );
  }

  const abas: { id: 'tecnico' | 'simples'; label: string }[] = [
    { id: 'tecnico', label: 'Técnico' },
    { id: 'simples', label: 'Em Palavras Simples' },
  ];

  return (
    <div className="mt-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div role="tablist" aria-label="Forma de apresentação" className="tabs">
          {abas.map((aba) => (
            <button
              key={aba.id}
              type="button"
              role="tab"
              aria-selected={view === aba.id}
              onClick={() => setView(aba.id)}
              className={`tab ${view === aba.id ? 'tab-active' : ''}`}
            >
              {aba.label}
            </button>
          ))}
        </div>
        <BotoesCartao card={card} />
      </div>

      {card.cache_hit && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <Icone nome="faisca" tamanho={14} />
          Resposta do cache (base inalterada)
        </p>
      )}

      {view === 'tecnico' && (
        <div className="space-y-5">
          <CartaoTecnico card={card} />
          <NormasAplicaveis normas={card.normas} />

          {card.checklist_ait && card.checklist_ait.length > 0 && <ChecklistAit itens={card.checklist_ait} />}

          {card.erros_comuns && card.erros_comuns.length > 0 && (
            <section className="card card-pad" aria-labelledby="erros-comuns">
              <h3 id="erros-comuns" className="section-title">
                <Icone nome="alerta" tamanho={18} className="text-danger" />
                Erros Comuns
              </h3>
              <ul className="mt-3 space-y-2">
                {card.erros_comuns.map((item, idx) => {
                  const { texto, alerta } = erroComum(item);
                  return (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-ink">
                      <Icone
                        nome={alerta ? 'alerta' : 'x'}
                        tamanho={16}
                        className={`mt-0.5 shrink-0 ${alerta ? 'text-warn' : 'text-danger'}`}
                      />
                      <span>{texto}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <JurisprudenciaBloco decisoes={card.jurisprudencia} />
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}

      {view === 'simples' && (
        <div className="space-y-5">
          <CartaoSimples card={card} />
          <JurisprudenciaBloco decisoes={card.jurisprudencia} />
          <CitacaoEvidencia citacoes={card.citacoes} />
        </div>
      )}
    </div>
  );
}
