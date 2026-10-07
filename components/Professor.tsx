'use client';

import { useEffect, useRef, useState } from 'react';
import type {
  ComparacaoInfracao,
  FonteProfessor,
  MensagemProfessor,
  ModoProfessor,
  OpcaoEsclarecimento,
  TipoFonte,
} from '@/lib/rag/professor';
import BotaoVoz, { AvisoVoz, useDitado } from './BotaoVoz';
import RespostaFormatada from './pop/RespostaFormatada';
import Field from './ui/Field';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import TitleCard from './ui/TitleCard';

interface Turno {
  pergunta: string;
  resposta: string | null;
  fontes: FonteProfessor[];
  modelo: string | null;
  local?: boolean;
  esclarecimento?: { pergunta: string; opcoes: OpcaoEsclarecimento[] };
  comparacao?: ComparacaoInfracao[];
  aviso?: string;
}

const MODOS: Array<{ valor: ModoProfessor; titulo: string; descricao: string }> = [
  { valor: 'auto', titulo: 'Automático', descricao: 'Escolhe a melhor base' },
  { valor: 'ctb', titulo: 'CTB', descricao: 'Artigos e legislação' },
  { valor: 'infracao', titulo: 'Infrações', descricao: 'Fichas do MBFT' },
  { valor: 'pop', titulo: 'POP', descricao: 'Procedimento passo a passo' },
  { valor: 'simulador', titulo: 'Simulador', descricao: 'Analisa uma ocorrência' },
];

const SUGESTOES = [
  'Posso usar o celular parado no semáforo?',
  'Qual a infração de dirigir sem CNH e quanto custa a multa?',
  'Recusar o bafômetro dá multa? Existe jurisprudência?',
  'Qual POP orienta a busca pessoal durante uma abordagem?',
  'Quando o uso de algemas é permitido pelo POP?',
  'A lei do farol baixo nas rodovias mudou?',
  'Tem projeto de lei para mudar a pontuação da CNH?',
];

const TIPO: Record<TipoFonte, string> = {
  ctb: 'Lei',
  mbft: 'MBFT',
  pop: 'POP',
  jurisprudencia: 'Jurisprudência',
  projeto: 'Projeto de lei',
};

function Fontes({ fontes, prefixo }: { fontes: FonteProfessor[]; prefixo: string }) {
  if (fontes.length === 0) return null;
  return (
    <details className="mt-3 rounded-control border border-ds-line p-3">
      <summary className="cursor-pointer font-mono text-xs font-bold uppercase tracking-[0.08em] text-ds-subtle">
        Fontes consultadas ({fontes.length})
      </summary>
      <ol className="mt-3 space-y-2">
        {fontes.map((f) => (
          <li key={f.n} id={`${prefixo}-${f.n}`} className="rounded-control bg-ds-muted p-3 text-sm">
            <p className="flex flex-wrap items-center gap-2">
              <span className="grid h-6 min-w-6 place-items-center rounded-md bg-ds-primary px-1 font-mono text-xs font-bold text-ds-on-solid">
                {f.n}
              </span>
              <span className="badge-neutral">{TIPO[f.tipo]}</span>
              <span className="font-semibold text-ds-text">{f.titulo}</span>
            </p>
            <p className="mt-1.5 line-clamp-4 whitespace-pre-line text-ds-subtle">{f.texto}</p>
            {f.link && (
              <a href={f.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-semibold text-ds-ink underline">
                Ver na fonte oficial
              </a>
            )}
          </li>
        ))}
      </ol>
    </details>
  );
}

function Comparacao({ itens }: { itens: ComparacaoInfracao[] }) {
  if (itens.length < 2) return null;
  return (
    <div className="mt-4 overflow-x-auto" aria-label="Comparação entre infrações">
      <div className="grid min-w-[640px] gap-3" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
        {itens.map((item) => (
          <section key={item.codigo} className="rounded-xl border border-ds-line bg-ds-muted p-4">
            <p className="font-mono text-sm font-bold text-ds-primary-strong">{item.codigo}</p>
            <h3 className="mt-1 font-semibold text-ds-text">{item.descricao}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              {[
                ['Amparo', item.amparo], ['Gravidade', item.gravidade], ['Pontos', item.pontos],
                ['Penalidade', item.penalidade], ['Medida', item.medida], ['Quando autuar', item.quandoAutuar],
              ].map(([rotulo, valor]) => (
                <div key={rotulo}>
                  <dt className="font-semibold text-ds-subtle">{rotulo}</dt>
                  <dd className="text-ds-text">{valor || '—'}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * Chat with the "Professor Emérito". The conversation lives
 * in the browser; each question goes with the recent turns so follow-ups
 * ("e a multa?") keep their subject.
 */
export default function Professor() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pergunta, setPergunta] = useState('');
  const [modo, setModo] = useState<ModoProfessor>('auto');
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const fimRef = useRef<HTMLDivElement>(null);
  const ditado = useDitado({ onTranscricao: (t) => setPergunta((atual) => (atual ? `${atual} ${t}` : t)) });

  useEffect(() => {
    if (turnos.length) fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [turnos.length]);

  const perguntar = async (entrada: string) => {
    const texto = entrada.trim();
    if (texto.length < 3 || carregando) return;
    setCarregando(true);
    setErro(null);

    const historico: MensagemProfessor[] = turnos
      .slice(-3)
      .flatMap((t) => [
        { papel: 'agente' as const, texto: t.pergunta },
        ...(t.resposta ? [{ papel: 'professor' as const, texto: t.resposta }] : []),
      ]);

    try {
      const resposta = await fetch('/api/professor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto, historico, modo }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.message || 'O Professor Emérito não conseguiu responder.');
      setTurnos((atual) => [...atual, { pergunta: texto, ...(corpo as Omit<Turno, 'pergunta'>) }]);
      setPergunta('');
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="space-y-6">
      <TitleCard
        titulo="Professor Emérito"
        icone="professor"
        subtitulo="Tire dúvidas sobre CTB, infrações do MBFT e procedimentos dos POPs. O Professor Emérito consulta primeiro os manuais oficiais disponíveis no aplicativo."
      />

      {turnos.length > 0 && (
        <ol className="space-y-5" aria-label="Conversa">
          {turnos.map((turno, i) => (
            <li key={i} className="space-y-3">
              <div className="ml-auto max-w-[90%] rounded-control border-2 border-ds-border bg-ds-muted px-4 py-3 text-sm text-ds-text sm:max-w-[80%]">
                <p className="stat-label">Você</p>
                <p className="mt-1 whitespace-pre-line">{turno.pergunta}</p>
              </div>
              <article className="card card-pad">
                <p className="section-title">
                  <Icone nome="professor" tamanho={18} className="shrink-0" />
                  Professor Emérito
                </p>
                <div className="mt-3">
                  {turno.resposta ? (
                    <RespostaFormatada texto={turno.resposta} prefixo={`prof-${i}`} />
                  ) : (
                    <p className="text-sm text-ds-subtle">{turno.aviso ?? 'Sem resposta.'}</p>
                  )}
                </div>
                {turno.comparacao && <Comparacao itens={turno.comparacao} />}
                {turno.esclarecimento && (
                  <fieldset className="mt-4 rounded-xl border border-ds-primary bg-ds-primary-soft p-4">
                    <legend className="px-1 text-sm font-semibold text-ds-text">{turno.esclarecimento.pergunta}</legend>
                    <div className="mt-2 space-y-2">
                      {turno.esclarecimento.opcoes.map((opcao) => (
                        <button
                          key={opcao.valor}
                          type="button"
                          className="block w-full rounded-lg border border-ds-line bg-ds-surface p-3 text-left hover:border-ds-primary"
                          onClick={() => void perguntar(`Analise a infração de código ${opcao.valor}.`)}
                          disabled={carregando}
                        >
                          <span className="block font-semibold text-ds-text">{opcao.titulo}</span>
                          <span className="mt-1 block text-sm text-ds-subtle">{opcao.descricao}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {turno.resposta && (
                  <p className="mt-3 text-xs text-ds-subtle">
                    {turno.local
                      ? 'Resposta rápida montada diretamente das fontes oficiais abaixo.'
                      : `Resposta gerada por IA (${turno.modelo}) a partir das fontes abaixo.`}{' '}
                    Confira a norma antes de agir.
                  </p>
                )}
                <Fontes fontes={turno.fontes} prefixo={`prof-${i}`} />
              </article>
            </li>
          ))}
        </ol>
      )}

      <div ref={fimRef} className="card card-pad scroll-mt-32">
        <fieldset className="mb-5">
          <legend className="label">Modo de consulta</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MODOS.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                aria-pressed={modo === opcao.valor}
                className={`rounded-xl border p-3 text-left transition-colors ${
                  modo === opcao.valor ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-line bg-ds-surface hover:border-ds-primary'
                }`}
                onClick={() => {
                  setModo(opcao.valor);
                  setTurnos([]);
                  setErro(null);
                }}
                disabled={carregando}
              >
                <span className="block text-sm font-semibold text-ds-text">{opcao.titulo}</span>
                <span className="mt-0.5 block text-xs text-ds-subtle">{opcao.descricao}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void perguntar(pergunta);
          }}
        >
          <div>
            <Field
              as="textarea"
              label={turnos.length ? 'Continue a conversa' : 'Sua pergunta ao Professor Emérito'}
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void perguntar(pergunta);
                }
              }}
              rows={3}
              maxLength={800}
              enterKeyHint="send"
              placeholder={modo === 'simulador'
                ? 'Descreva ação, veículo, local, sinalização e circunstâncias observadas.'
                : modo === 'pop'
                  ? 'Ex.: Qual o procedimento para busca pessoal durante uma abordagem?'
                  : 'Ex.: Estacionar na calçada é infração? Como explico isso para um cidadão?'}
              controlClassName="min-h-[96px] resize-none"
              acao={<BotaoVoz ditado={ditado} />}
            />
            <AvisoVoz ditado={ditado} />
          </div>

          {modo === 'simulador' && (
            <p className="rounded-lg bg-ds-muted p-3 text-sm text-ds-subtle">
              Inclua somente fatos observados. O simulador mostrará possibilidades e perguntará o que faltar antes de indicar uma ficha.
            </p>
          )}

          {erro && (
            <p className="field-error" role="alert">
              {erro}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <PrimaryButton
              type="submit"
              icone="professor"
              carregando={carregando}
              textoCarregando="O Professor Emérito está pensando…"
              disabled={pergunta.trim().length < 3}
              className="flex-1 text-base"
            >
              Perguntar
            </PrimaryButton>
            {turnos.length > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setTurnos([])} disabled={carregando}>
                Nova conversa
              </button>
            )}
          </div>

          {turnos.length === 0 && (
            <div>
              <p className="label">Experimente</p>
              <div className="flex flex-wrap gap-2">
                {SUGESTOES.map((s) => (
                  <button key={s} type="button" className="chip" onClick={() => void perguntar(s)} disabled={carregando}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
