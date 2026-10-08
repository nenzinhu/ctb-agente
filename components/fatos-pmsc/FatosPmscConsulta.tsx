'use client';

import { useState } from 'react';
import BotaoVoz, { AvisoVoz, useDitado } from '../BotaoVoz';
import Field from '../ui/Field';
import Icone from '../ui/Icone';
import PrimaryButton from '../ui/PrimaryButton';
import SectionCard from '../ui/SectionCard';

interface Alternativa {
  grupo: string;
  natureza: string;
  potencialOfensivo: string;
  versao: string;
  compatibilidade: string;
}

const EXEMPLOS = ['som alto', 'perdeu os documentos', 'acidente só com danos', 'vias de fato'];

export default function FatosPmscConsulta() {
  const [consulta, setConsulta] = useState('');
  const [alternativas, setAlternativas] = useState<Alternativa[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const ditado = useDitado({ onTranscricao: (texto) => setConsulta((atual) => atual ? `${atual} ${texto}` : texto) });

  const pesquisar = async (entrada = consulta) => {
    const texto = entrada.trim();
    if (texto.length < 3 || carregando) return;
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch('/api/fatos-pmsc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consulta: texto }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message || 'Não foi possível consultar a lista.');
      setAlternativas((body?.alternativas ?? []) as Alternativa[]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível consultar a lista.');
      setAlternativas(null);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionCard titulo="Consultar natureza" icone="busca" className="consultation-card">
        <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void pesquisar(); }}>
          <div>
            <Field
              as="textarea"
              label="Descreva o fato constatado"
              value={consulta}
              onChange={(event) => { setConsulta(event.target.value); setErro(null); }}
              rows={4}
              maxLength={500}
              placeholder="Ex: Som alto perturbando os vizinhos"
              hint="Aceita abreviações, gírias, erros de digitação, palavras incompletas e frases. Não informe dados pessoais."
              erro={erro}
              acao={<BotaoVoz ditado={ditado} />}
              controlClassName="min-h-[124px] resize-y leading-relaxed"
            />
            <AvisoVoz ditado={ditado} />
          </div>
          <PrimaryButton type="submit" icone="busca" carregando={carregando} textoCarregando="Consultando…" disabled={consulta.trim().length < 3} className="w-full">
            Consultar lista
          </PrimaryButton>
          <div className="border-t border-ds-line pt-4">
            <p className="mb-2 text-xs font-semibold text-ds-subtle">Experimente uma descrição</p>
            <div className="flex flex-wrap gap-2">
              {EXEMPLOS.map((exemplo) => (
                <button key={exemplo} type="button" className="chip" disabled={carregando} onClick={() => { setConsulta(exemplo); void pesquisar(exemplo); }}>
                  {exemplo}
                </button>
              ))}
            </div>
          </div>
        </form>
      </SectionCard>

      {alternativas ? (
        <section className="space-y-4" aria-labelledby="resultado-fatos">
          <div className="rounded-control border border-ds-line bg-ds-surface p-4">
            <h2 id="resultado-fatos" className="flex items-center gap-2 font-semibold text-ds-text"><Icone nome="lista" tamanho={18} /> Naturezas encontradas</h2>
            <p className="mt-1 text-sm text-ds-subtle">
              {alternativas.length > 1 ? 'Confira as alternativas antes de registrar.' : 'Confira os dados na lista antes de registrar.'}
            </p>
          </div>
          {alternativas.length === 0 ? (
            <div className="empty-state"><p className="font-semibold">Nenhuma correspondência segura.</p><p className="mt-1 text-sm">Tente descrever o fato com outras palavras.</p></div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              {alternativas.map((item) => (
                <article key={`${item.grupo}:${item.natureza}`} className="card card-pad min-w-0">
                  <span className="badge-brand">{item.compatibilidade}</span>
                  <h3 className="mt-3 text-lg font-semibold leading-snug text-ds-text">{item.natureza}</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="font-semibold text-ds-subtle">Grupo</dt><dd>{item.grupo}</dd></div>
                    <div><dt className="font-semibold text-ds-subtle">Potencial ofensivo</dt><dd>{item.potencialOfensivo}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <p className="text-center text-xs text-ds-subtle">Lista atualizada em 10/06/2019.</p>
    </div>
  );
}
