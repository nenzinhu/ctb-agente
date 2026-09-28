'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CasoPratico } from '@/lib/mbft/casos';
import BotaoVoz, { AvisoVoz, useDitado } from './BotaoVoz';
import Field from './ui/Field';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import TitleCard from './ui/TitleCard';

const TEMAS = ['recusou o bafômetro', 'celular na mão', 'moto sem capacete', 'estacionado na calçada', 'sem CNH', 'sem cinto'];

interface Resultado {
  tema: string;
  principais: CasoPratico[];
  relacionadas: CasoPratico[];
}

function Lista({ titulo, itens, tom }: { titulo: string; itens: string[]; tom: 'sim' | 'nao' }) {
  if (itens.length === 0) return null;
  return (
    <div className={`rounded-control border-2 p-3 ${tom === 'nao' ? 'border-ds-danger' : 'border-ds-line'}`}>
      <p className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.06em] text-ds-text">
        <Icone nome={tom === 'nao' ? 'x' : 'check'} tamanho={16} className={tom === 'nao' ? 'text-ds-danger' : 'text-ds-primary'} />
        {titulo}
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-ds-text">
        {itens.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** One official sheet in field form: what to write, when to issue and when not to. */
function CartaoCaso({ caso }: { caso: CasoPratico }) {
  return (
    <article className="card card-pad space-y-3">
      <header className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border-2 border-ds-border bg-ds-surface px-2.5 py-1 font-mono text-sm font-bold text-ds-text">
          {caso.codigo}
        </span>
        <span className="badge-neutral">{caso.gravidade}</span>
        <span className="text-sm text-ds-subtle">{caso.amparo}</span>
      </header>
      <p className="text-base font-semibold leading-snug text-ds-text">{caso.infracao}</p>

      {caso.crime && (
        <p className="alert-error" role="note">
          <Icone nome="alerta" tamanho={16} className="mt-0.5 shrink-0" />
          <span>
            <strong>Também pode ser crime:</strong> {caso.crime}.
          </span>
        </p>
      )}

      {caso.medidaAdministrativa && !/^n[ãa]o\b/i.test(caso.medidaAdministrativa) && (
        <p className="text-sm text-ds-text">
          <span className="font-semibold">Medida administrativa: </span>
          {caso.medidaAdministrativa}
        </p>
      )}

      {caso.exemplos.length > 0 && (
        <div>
          <p className="label">Como descrever no AIT (exemplos do MBFT)</p>
          <ol className="list-inside list-decimal space-y-1 text-sm leading-relaxed text-ds-text">
            {caso.exemplos.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ol>
        </div>
      )}

      <Lista titulo="Quando autuar" itens={caso.quandoAutuar} tom="sim" />
      <Lista titulo="Quando NÃO autuar" itens={caso.quandoNaoAutuar} tom="nao" />

      <Link href={`/consulta?q=${encodeURIComponent(caso.codigo)}`} className="inline-block text-sm font-semibold text-ds-ink underline">
        Abrir a ficha completa de {caso.codigo}
      </Link>
    </article>
  );
}

/**
 * Field cases: the agent describes the situation (words, slang, code or
 * article) and gets the official MBFT conduct with its criteria. No AI.
 */
export default function CasosPraticos() {
  const [busca, setBusca] = useState('');
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ditado = useDitado({ onTranscricao: (t) => setBusca((atual) => (atual ? `${atual} ${t}` : t)) });

  const consultar = async (texto: string) => {
    const tema = texto.trim();
    if (tema.length < 2 || carregando) return;
    setBusca(tema);
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/casos?tema=${encodeURIComponent(tema)}`, { cache: 'no-store' });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.message || 'Não foi possível consultar.');
      setResultado(corpo as Resultado);
    } catch (error) {
      setResultado(null);
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <TitleCard
        titulo="Casos práticos"
        icone="check"
        subtitulo="Descreva a situação da abordagem e veja a conduta oficial do MBFT: o enquadramento, como descrever no AIT e quando não autuar."
      />

      <form
        className="card card-pad space-y-3"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          void consultar(busca);
        }}
      >
        <Field
          label="Qual é a situação?"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          maxLength={200}
          enterKeyHint="search"
          placeholder="Ex.: recusou o bafômetro, garupa sem capacete, 516-91"
          hint="Palavras do dia a dia, gíria, código ou artigo."
          acao={<BotaoVoz ditado={ditado} />}
        />
        <AvisoVoz ditado={ditado} />
        <PrimaryButton
          type="submit"
          icone="busca"
          carregando={carregando}
          textoCarregando="Consultando…"
          disabled={busca.trim().length < 2}
          className="w-full text-base"
        >
          Ver a conduta
        </PrimaryButton>
        <div className="flex flex-wrap gap-2">
          {TEMAS.map((t) => (
            <button key={t} type="button" className="chip" onClick={() => void consultar(t)} disabled={carregando}>
              {t}
            </button>
          ))}
        </div>
      </form>

      {erro && (
        <p className="field-error" role="alert">
          {erro}
        </p>
      )}

      {resultado && (
        <section aria-label="Resultado" aria-live="polite" className="space-y-4">
          <h2 className="section-title">Conduta indicada para “{resultado.tema}”</h2>
          {resultado.principais.map((c) => (
            <CartaoCaso key={c.codigo} caso={c} />
          ))}

          {resultado.relacionadas.length > 0 && (
            <details className="space-y-4">
              <summary className="cursor-pointer text-sm font-semibold text-ds-text">
                Situações parecidas ({resultado.relacionadas.length}) — confira os critérios antes de usar
              </summary>
              <div className="mt-4 space-y-4">
                {resultado.relacionadas.map((c) => (
                  <CartaoCaso key={c.codigo} caso={c} />
                ))}
              </div>
            </details>
          )}

          <p className="text-xs text-ds-subtle">
            Texto oficial do MBFT (Volume I). Confira a ficha completa e a redação vigente antes de lavrar o AIT.
          </p>
        </section>
      )}
    </div>
  );
}
