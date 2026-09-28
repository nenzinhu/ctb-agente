'use client';

import { useEffect, useRef, useState } from 'react';
import type { FonteProfessor, MensagemProfessor, TipoFonte } from '@/lib/rag/professor';
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
  aviso?: string;
}

// Short, concrete questions a layperson would ask, grouped so the first
// screen teaches what the professor can do.
const SUGESTOES: { tema: string; perguntas: string[] }[] = [
  {
    tema: 'Explica fácil',
    perguntas: [
      'Explique a lei seca como se eu tivesse 12 anos',
      'Por que criança precisa de cadeirinha no carro?',
      'O que acontece se eu dirigir sem carteira?',
    ],
  },
  {
    tema: 'Na prática',
    perguntas: [
      'Posso usar o celular parado no semáforo?',
      'Recusar o bafômetro dá multa?',
      'Parar em cima da calçada é infração?',
    ],
  },
  {
    tema: 'Lei e tribunais',
    perguntas: [
      'A lei do farol baixo nas rodovias mudou?',
      'Tem projeto de lei para mudar a pontuação da CNH?',
      'Existe jurisprudência sobre recusa do bafômetro?',
    ],
  },
];

const TIPO: Record<TipoFonte, string> = {
  ctb: 'Lei',
  mbft: 'MBFT',
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

/**
 * Chat with the "Professor Grão-Mestre em Trânsito". The conversation lives
 * in the browser; each question goes with the recent turns so follow-ups
 * ("e a multa?") keep their subject.
 */
export default function Professor() {
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [pergunta, setPergunta] = useState('');
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
        body: JSON.stringify({ pergunta: texto, historico }),
      });
      const corpo = await resposta.json().catch(() => null);
      if (!resposta.ok) throw new Error(corpo?.message || 'O professor não conseguiu responder.');
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
        titulo="Professor Grão-Mestre em Trânsito"
        icone="professor"
        subtitulo="Pergunte qualquer coisa sobre o CTB: qual é a infração, como explicar com exemplos, se há jurisprudência, se a lei mudou ou se há projeto para mudar."
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
                  Professor
                </p>
                <div className="mt-3">
                  {turno.resposta ? (
                    <RespostaFormatada texto={turno.resposta} prefixo={`prof-${i}`} />
                  ) : (
                    <p className="text-sm text-ds-subtle">{turno.aviso ?? 'Sem resposta.'}</p>
                  )}
                </div>
                {turno.resposta && (
                  <p className="mt-3 text-xs text-ds-subtle">
                    Resposta gerada por IA ({turno.modelo}) a partir das fontes abaixo. Confira a norma antes de agir.
                  </p>
                )}
                <Fontes fontes={turno.fontes} prefixo={`prof-${i}`} />
              </article>
            </li>
          ))}
        </ol>
      )}

      <div ref={fimRef} className="card card-pad scroll-mt-32">
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
              label={turnos.length ? 'Continue a conversa' : 'Sua pergunta ao professor'}
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
              placeholder="Ex.: Estacionar na calçada é infração? Como explico isso para um cidadão?"
              controlClassName="min-h-[96px] resize-none"
              acao={<BotaoVoz ditado={ditado} />}
            />
            <AvisoVoz ditado={ditado} />
          </div>

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
              textoCarregando="O professor está pensando…"
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
            <div className="space-y-3">
              {SUGESTOES.map((grupo) => (
                <div key={grupo.tema}>
                  <p className="label">{grupo.tema}</p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.perguntas.map((s) => (
                      <button key={s} type="button" className="chip" onClick={() => void perguntar(s)} disabled={carregando}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
