'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { extrairMbftFields } from '@/lib/response/mbft-fields';
import CartaoTecnico from './CartaoTecnico';
import CartaoSimples from './CartaoSimples';
import FichaFiscalizacao from './FichaFiscalizacao';
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
          <Icone nome="check" tamanho={18} className="text-ds-primary" />
          Checklist do AIT
        </h3>
        <span className="badge-neutral">
          {feitos.size}/{itens.length}
        </span>
      </div>
      <ul className="mt-4 space-y-1">
        {itens.map((item, i) => (
          <li key={i}>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-ds-muted">
              <input
                type="checkbox"
                checked={feitos.has(i)}
                onChange={() => alternar(i)}
                className="mt-0.5 h-5 w-5 shrink-0 rounded border-ds-line accent-ds-primary"
              />
              <span className={`text-sm ${feitos.has(i) ? 'text-ds-subtle line-through' : 'text-ds-text'}`}>{semMarcador(item)}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ConsultaResult({ card }: ConsultaResultProps) {
  const [view, setView] = useState<'ficha' | 'tecnico' | 'simples'>('ficha');

  if (!card.sucesso) {
    return (
      <div className="card card-pad mt-6">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ds-warn/10 text-ds-warn">
            <Icone nome="busca" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-ds-text">Nada encontrado na base</h2>
            <p className="mt-1 text-sm text-ds-subtle">
              {card.explicacao_simples || 'A base ainda não tem conteúdo para esta consulta.'}
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-1.5 text-sm text-ds-subtle">
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

  // Short labels on phones: the three full ones don't fit a 360px screen.
  const abas: { id: 'ficha' | 'tecnico' | 'simples'; label: string; curto: string }[] = [
    { id: 'ficha', label: 'Ficha de Fiscalização', curto: 'Ficha' },
    { id: 'tecnico', label: 'Técnico', curto: 'Técnico' },
    { id: 'simples', label: 'Em Palavras Simples', curto: 'Simples' },
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
              aria-label={aba.label}
              className={`tab ${view === aba.id ? 'tab-active' : ''}`}
            >
              {aba.curto === aba.label ? (
                aba.label
              ) : (
                <>
                  <span className="sm:hidden">{aba.curto}</span>
                  <span className="hidden sm:inline">{aba.label}</span>
                </>
              )}
            </button>
          ))}
        </div>
        <BotoesCartao card={card} />
      </div>

      {card.cache_hit && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-ds-subtle">
          <Icone nome="faisca" tamanho={14} />
          Resposta do cache (base inalterada)
        </p>
      )}

      {view === 'ficha' && (
        <div className="space-y-5">
          <FichaFiscalizacao card={card} campos={extrairMbftFields(card.normas.map((n) => n.texto))} />
          {card.checklist_ait && card.checklist_ait.length > 0 && <ChecklistAit itens={card.checklist_ait} />}
          <JurisprudenciaBloco decisoes={card.jurisprudencia} />
        </div>
      )}

      {view === 'tecnico' && (
        <div className="space-y-5">
          <CartaoTecnico card={card} />
          <NormasAplicaveis normas={card.normas} />

          {card.checklist_ait && card.checklist_ait.length > 0 && <ChecklistAit itens={card.checklist_ait} />}

          {card.erros_comuns && card.erros_comuns.length > 0 && (
            <section className="card card-pad" aria-labelledby="erros-comuns">
              <h3 id="erros-comuns" className="section-title">
                <Icone nome="alerta" tamanho={18} className="text-ds-danger" />
                Erros Comuns
              </h3>
              <ul className="mt-3 space-y-2">
                {card.erros_comuns.map((item, idx) => {
                  const { texto, alerta } = erroComum(item);
                  return (
                    <li key={idx} className="flex items-start gap-2.5 text-sm text-ds-text">
                      <Icone
                        nome={alerta ? 'alerta' : 'x'}
                        tamanho={16}
                        className={`mt-0.5 shrink-0 ${alerta ? 'text-ds-warn' : 'text-ds-danger'}`}
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
