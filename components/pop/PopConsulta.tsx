'use client';

import { useEffect, useState } from 'react';
import type { FontePop, RespostaPop } from '@/lib/rag/pop';
import { referenciaDaFonte } from '@/lib/rag/pop';
import TurnstileWidget, { turnstileConfigurado } from '../TurnstileWidget';
import BotaoVoz, { AvisoVoz, useDitado } from '../BotaoVoz';
import Field from '../ui/Field';
import Icone from '../ui/Icone';
import PrimaryButton from '../ui/PrimaryButton';
import SectionCard from '../ui/SectionCard';
import RespostaFormatada from './RespostaFormatada';

const EXEMPLOS = [
  'Como proceder na abordagem a pessoas?',
  'Quando é permitido o uso de algemas?',
  'Procedimento em acidente de trânsito com vítima',
  'Como realizar a busca pessoal?',
];

function Fonte({ fonte }: { fonte: FontePop }) {
  const [aberta, setAberta] = useState(false);
  const longo = fonte.texto.length > 320;
  return (
    <li id={`fonte-${fonte.n}`} className="rounded-control border border-ds-line bg-ds-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-ds-primary font-mono text-xs font-bold text-ds-on-solid">
          {fonte.n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ds-text">{fonte.titulo}</p>
          <p className="mt-0.5 text-xs text-ds-subtle">{referenciaDaFonte({ titulo: '', secao: fonte.secao, pagina: fonte.pagina }) || 'Trecho do documento'}</p>
          <p className={`mt-2 whitespace-pre-line text-sm leading-relaxed text-ds-text ${!aberta && longo ? 'line-clamp-4' : ''}`}>
            {fonte.texto}
          </p>
          {longo && (
            <button type="button" className="mt-1 text-xs font-semibold text-ds-ink underline" onClick={() => setAberta(!aberta)}>
              {aberta ? 'Mostrar menos' : 'Ver trecho completo'}
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

/** Seconds since `ativo` turned on, so a long wait shows it is still working. */
function useSegundos(ativo: boolean): number {
  const [segundos, setSegundos] = useState(0);
  useEffect(() => {
    setSegundos(0);
    if (!ativo) return undefined;
    const inicio = Date.now();
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(id);
  }, [ativo]);
  return segundos;
}

/**
 * Ask the POP-PMSC base: the answer (when AI is available) cites the
 * excerpts it came from, and the excerpts are always shown.
 */
export default function PopConsulta() {
  const [pergunta, setPergunta] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespostaPop | null>(null);
  const segundos = useSegundos(carregando);
  const ditado = useDitado({ onTranscricao: (texto) => setPergunta((atual) => (atual ? `${atual} ${texto}` : texto)) });

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
        body: JSON.stringify({ pergunta: texto, turnstileToken: token ?? undefined }),
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

  return (
    <div className="space-y-5">
      <SectionCard numero={1} titulo="Pergunta">
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
              id="pergunta-pop"
              label="Sua pergunta sobre os POPs"
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
              controlClassName="min-h-[96px] resize-none"
              acao={<BotaoVoz ditado={ditado} />}
            />
            <AvisoVoz ditado={ditado} />
          </div>
          <PrimaryButton
            type="submit"
            icone="busca"
            carregando={carregando}
            textoCarregando="Consultando os POPs…"
            disabled={pergunta.trim().length < 3}
            className="w-full text-base"
          >
            Perguntar
          </PrimaryButton>
          <TurnstileWidget onToken={setToken} />
          <div>
            <p className="label">Experimente</p>
            <div className="flex flex-wrap gap-2">
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
          </div>
        </form>
      </SectionCard>

      {carregando && (
        <div className="card card-pad space-y-3" role="status" aria-live="polite">
          <p className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ds-subtle">
            <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-ds-primary" aria-hidden />
            {segundos < 2 ? 'Buscando nos POPs…' : 'Gerando a resposta com IA…'}
            {segundos >= 2 && <span aria-hidden>{segundos}s</span>}
          </p>
          <div className="skeleton h-5 w-1/3" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
        </div>
      )}

      {erro && (
        <div className="alert-error" role="alert">
          <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
          <p>{erro}</p>
        </div>
      )}

      {resultado && (
        <div className="space-y-5">
          {resultado.resposta && !resultado.semResposta && (
            <SectionCard
              numero={2}
              titulo="Resposta"
              acao={
                <span className="badge-neutral" title={resultado.modelo ?? undefined}>
                  {resultado.cache_hit ? 'do cache' : 'gerada por IA'}
                  {resultado.geral ? ' · sem fonte nos POPs' : ' a partir dos POPs'}
                </span>
              }
            >
              {resultado.geral && (
                <div className="alert-warn mb-4" role="note">
                  <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-warn" />
                  <p>
                    <strong>Os POPs indexados não tratam disso.</strong> Resposta geral da IA
                    {resultado.modelo ? ` (${resultado.modelo})` : ''}, sem fonte oficial: confirme com o POP vigente ou o
                    comando antes de agir.
                  </p>
                </div>
              )}
              <RespostaFormatada texto={resultado.resposta} />
              {!resultado.geral && (
                <p className="mt-4 flex items-start gap-1.5 border-t border-ds-line pt-3 text-xs text-ds-subtle">
                  <Icone nome="info" tamanho={14} className="mt-0.5 shrink-0" />
                  Texto gerado automaticamente com base nos trechos abaixo. Confira sempre a fonte antes de agir.
                </p>
              )}
            </SectionCard>
          )}

          {resultado.semResposta && (
            <div className="alert-warn">
              <Icone nome="busca" className="mt-0.5 shrink-0 text-ds-warn" />
              <div>
                <p className="font-semibold">Não encontrei isso nos POPs indexados.</p>
                <p className="mt-1 text-ds-subtle">
                  Tente outras palavras (ex.: o nome do procedimento) ou peça ao master para anexar o POP correspondente.
                </p>
              </div>
            </div>
          )}

          {resultado.aviso && (
            <div className="alert-info">
              <Icone nome="info" className="mt-0.5 shrink-0 text-ds-ink" />
              <p>{resultado.aviso}</p>
            </div>
          )}

          {resultado.fontes.length > 0 && (
            <SectionCard titulo={`Trechos dos POPs (${resultado.fontes.length})`} icone="lista">
              <ol className="space-y-3">
                {resultado.fontes.map((fonte) => (
                  <Fonte key={fonte.n} fonte={fonte} />
                ))}
              </ol>
            </SectionCard>
          )}
        </div>
      )}
    </div>
  );
}
