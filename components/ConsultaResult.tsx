'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CartaoEstruturado } from '@/lib/response/response-types';
import { listarFichasMbft, type MbftFields } from '@/lib/response/mbft-fields';
import type { FichaMbft } from '@/lib/mbft/parser';
import CartaoTecnico from './CartaoTecnico';
import CartaoSimples from './CartaoSimples';
import FichaFiscalizacao from './FichaFiscalizacao';
import CitacaoEvidencia from './CitacaoEvidencia';
import NormasAplicaveis from './NormasAplicaveis';
import JurisprudenciaBloco from './JurisprudenciaBloco';
import BotoesCartao from './BotoesCartao';
import ResultChoices from './ui/ResultChoices';
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

interface OpcaoFicha {
  rotulo: string;
  oficial?: FichaMbft;
  /** The registered enquadramento goes with the first option only */
  card: CartaoEstruturado;
  campos: MbftFields | null;
}

function resumo(texto: string | null, limite = 70): string {
  if (!texto) return '';
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
}

/**
 * The Ficha de Fiscalização, with a picker when the query matches more than
 * one enquadramento (e.g. several incisos of the same article).
 */
function FichaEscolhida({ card }: { card: CartaoEstruturado }) {
  const opcoes = useMemo<OpcaoFicha[]>(() => {
    if (card.fichas_mbft?.length) {
      return card.fichas_mbft.map((f) => ({
        rotulo: `${f.codigo} — ${f.amparoLegal.replace(/\.$/, '')} — ${resumo(f.tipificacaoResumida, 60)}`,
        oficial: f,
        card,
        campos: null,
      }));
    }
    const fichas = listarFichasMbft(card.normas.map((n) => n.texto));
    const lista: OpcaoFicha[] = [];
    if (card.enquadramento) {
      const e = card.enquadramento;
      lista.push({ rotulo: `${e.codigo_mbft} — ${resumo(e.descricao)}`, card, campos: fichas[0] ?? null });
      fichas.slice(1).forEach((f) =>
        lista.push({ rotulo: `${f.amparo ?? 'MBFT'} — ${resumo(f.tipificacao)}`, card: { ...card, enquadramento: null }, campos: f })
      );
    } else {
      fichas.forEach((f, i) =>
        lista.push({ rotulo: `${f.amparo ?? 'MBFT'} — ${resumo(f.tipificacao)}`, card: i === 0 ? card : { ...card, ficha_ia: null }, campos: f })
      );
    }
    return lista;
  }, [card]);
  const [indice, setIndice] = useState(0);

  if (opcoes.length === 0) return <FichaFiscalizacao card={card} campos={null} />;
  const atual = opcoes[Math.min(indice, opcoes.length - 1)];

  return (
    <div className="space-y-4">
      {opcoes.length > 1 && (
        <div className="print:hidden">
          <ResultChoices
            label={`Enquadramentos encontrados (${opcoes.length})`}
            value={String(indice)}
            onChange={(value) => setIndice(Number(value))}
            hint="Confira as alternativas e selecione a ficha que corresponde à situação."
            options={opcoes.map((opcao, i) => ({
              value: String(i),
              title: opcao.oficial ? `${opcao.oficial.codigo} — ${opcao.oficial.amparoLegal}` : opcao.rotulo,
              description: opcao.oficial?.tipificacaoResumida ?? opcao.campos?.tipificacao ?? undefined,
            }))}
          />
        </div>
      )}
      <FichaFiscalizacao card={atual.card} campos={atual.campos} oficial={atual.oficial} />
    </div>
  );
}

export default function ConsultaResult({ card }: ConsultaResultProps) {
  const [view, setView] = useState<'ficha' | 'tecnico' | 'simples'>('ficha');

  // The sheet is always shown, even with nothing found: empty fields read "—".
  if (!card.sucesso) {
    return (
      <div className="mobile-results-enter mt-6 space-y-5">
      <div className="card card-pad">
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
          <li>• Peça ao administrador para cadastrar o documento no painel</li>
        </ul>
        <Link href="/?form=1" className="btn-primary mt-5">
          Fazer nova consulta
        </Link>
      </div>
      <FichaEscolhida card={card} />
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
    <div className="mobile-results-enter mt-6 space-y-5">
      <div className="mobile-result-toolbar flex flex-wrap items-center justify-between gap-3 print:hidden">
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
          Resposta da memória temporária (base inalterada)
        </p>
      )}

      {view === 'ficha' && (
        <div className="space-y-5">
          <FichaEscolhida card={card} />
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
