'use client';

import { useEffect, useRef, useState } from 'react';
import { requestJson, RequestError } from '@/lib/client/request';
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
  pagina?: number;
  compatibilidade: string;
  scoreConfianca?: number;
  metodoEncontrado?: string;
}

const NOMES_METODO: Record<string, string> = {
  giria_exata: 'gíria exata',
  fuzzy_giria: 'gíria aproximada',
  fuzzy_oficial: 'nome oficial aproximado',
  identificador_exato: 'identificador exato',
  contexto_lexical: 'contexto da descrição',
};

const EXEMPLOS = ['som alto', 'perdeu os documentos', 'acidente só com danos', 'vias de fato'];

export default function FatosPmscConsulta() {
  const [consulta, setConsulta] = useState('');
  const [alternativas, setAlternativas] = useState<Alternativa[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const requisicao = useRef<AbortController | null>(null);
  useEffect(() => () => requisicao.current?.abort(), []);
  const ditado = useDitado({ onTranscricao: (texto) => setConsulta((atual) => atual ? `${atual} ${texto}` : texto) });

  const pesquisar = async (entrada = consulta) => {
    const texto = entrada.trim();
    if (texto.length < 3 || carregando) return;
    const controller = new AbortController();
    requisicao.current = controller;
    setCarregando(true);
    setAlternativas(null);
    setErro(null);
    try {
      const body = await requestJson<{ alternativas: Alternativa[] }>('/api/fatos-pmsc', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consulta: texto }),
      });
      if (!body || !Array.isArray(body.alternativas) || !body.alternativas.every((item) => item && typeof item.natureza === 'string' && typeof item.grupo === 'string' && typeof item.potencialOfensivo === 'string')) {
        throw new RequestError('invalid-response', 'O serviço retornou uma resposta inválida. Tente novamente.');
      }
      if (!controller.signal.aborted) setAlternativas(body.alternativas);
    } catch (error) {
      if (controller.signal.aborted) return;
      setErro(error instanceof Error ? error.message : 'Não foi possível consultar a lista.');
      setAlternativas(null);
    } finally {
      if (!controller.signal.aborted) setCarregando(false);
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
              acao={<BotaoVoz ditado={ditado} />}
              controlClassName="mobile-query-field min-h-[108px] resize-y leading-relaxed sm:min-h-[124px]"
            />
            <AvisoVoz ditado={ditado} />
          </div>
          <PrimaryButton type="submit" icone="busca" carregando={carregando} textoCarregando="Consultando…" disabled={consulta.trim().length < 3} className="min-h-12 w-full">
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

      {erro && <div role="alert" className="rounded-control border border-ds-line p-4 text-sm"><p>{erro}</p><button type="button" className="btn-secondary mt-3" onClick={() => void pesquisar()}>Tentar novamente</button><p className="mt-2 text-ds-subtle">Confira a lista de origem disponível na sua unidade antes de registrar.</p></div>}
      {carregando && <p role="status" className="text-sm text-ds-subtle">Consultando a lista. A espera é limitada a 15 segundos.</p>}
      {alternativas ? (
        <section className="mobile-results-enter space-y-4" aria-labelledby="resultado-fatos" aria-live="polite">
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
                <article key={`${item.grupo}:${item.natureza}`} className="mobile-result-card card card-pad min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="badge-brand">{item.compatibilidade}</span>
                    {typeof item.scoreConfianca === 'number' && (
                      <span className="badge-neutral">{item.scoreConfianca}% · {NOMES_METODO[item.metodoEncontrado ?? ''] ?? 'correspondência'}</span>
                    )}
                  </div>
                  <h3 className="mt-3 text-lg font-semibold leading-snug text-ds-text">{item.natureza}</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div><dt className="font-semibold text-ds-subtle">Grupo</dt><dd>{item.grupo}</dd></div>
                    <div><dt className="font-semibold text-ds-subtle">Potencial ofensivo</dt><dd>{item.potencialOfensivo}</dd></div>
                    <div><dt className="font-semibold text-ds-subtle">Fonte</dt><dd>Lista de Fatos PMSC Mobile{item.versao ? ` · versão de ${item.versao}` : ''}{item.pagina ? ` · página ${item.pagina}` : ''}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <aside className="alert-warn block"><strong>Fonte de origem: Lista de Fatos PMSC Mobile, versão de 10/06/2019.</strong><p className="mt-1">Essa é a data da lista incorporada, não uma revisão jurídica atual. Não há data de revisão posterior informada neste acervo. A ferramenta é apoio: confira a fonte vigente antes de registrar.</p></aside>
    </div>
  );
}
