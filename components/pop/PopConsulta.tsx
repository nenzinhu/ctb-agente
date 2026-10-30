'use client';

import { requestJson, RequestError } from '@/lib/client/request';
import { useEffect, useRef, useState } from 'react';
import type { FontePop, RespostaPop } from '@/lib/rag/pop';
import { referenciaDaFonte } from '@/lib/rag/pop';
import TurnstileWidget, { turnstileConfigurado } from '../TurnstileWidget';
import BotaoVoz, { AvisoVoz, useDitado } from '../BotaoVoz';
import Field from '../ui/Field';
import ResultChoices from '../ui/ResultChoices';
import Icone from '../ui/Icone';
import PrimaryButton from '../ui/PrimaryButton';
import SectionCard from '../ui/SectionCard';
import RespostaFormatada from './RespostaFormatada';
import FichaPop from './FichaPop';
import type { Pop } from '@/lib/pop/parser';
import ConsultaModes from '../ConsultaModes';
import SearchSuggestions from '../SearchSuggestions';
import type { ResumoPop } from '@/lib/pop/referencias';

/** Validate server data before passing it to the manual's structured renderer. */
function isPop(value: unknown): value is Pop {
  if (!value || typeof value !== 'object') return false;
  const pop = value as Record<string, unknown>;
  const stringFields = ['numero', 'titulo', 'estabelecido', 'atualizado', 'execucao'];
  const itemFields = ['material', 'sequencia', 'atividadesCriticas', 'errosEvitar', 'anexos'];
  return stringFields.every((key) => typeof pop[key] === 'string')
    && typeof pop.pagina === 'number' && Number.isFinite(pop.pagina)
    && itemFields.every((key) => Array.isArray(pop[key]) && pop[key].every((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as Record<string, unknown>;
      return typeof entry.texto === 'string' && typeof entry.nivel === 'number' && Number.isFinite(entry.nivel);
    }))
    && Array.isArray(pop.fundamentacao) && pop.fundamentacao.every((item: unknown) => {
      if (!item || typeof item !== 'object') return false;
      const entry = item as Record<string, unknown>;
      return typeof entry.norma === 'string' && typeof entry.especificacao === 'string';
    });
}

function validatePop(value: unknown): Pop {
  if (!isPop(value)) throw new RequestError('invalid-response', 'O serviço retornou um procedimento inválido. Tente novamente.');
  return value;
}

const EXEMPLOS = [
  'Como proceder na abordagem a pessoas?',
  'Quando é permitido o uso de algemas?',
  'Procedimento em acidente de trânsito com vítima',
  'Revista pessoal',
];

const ROTULO_METODO: Record<string, string> = {
  giria_exata: 'gíria exata',
  fuzzy_giria: 'gíria aproximada',
  fuzzy_oficial: 'nome oficial aproximado',
  identificador_exato: 'identificador exato',
  contexto_lexical: 'contexto da descrição',
};

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

/** The matching POPs in standard form, with a picker when there are several */
export function PopsEncontrados({ pops, catalogo = [] }: { pops: Pop[]; catalogo?: ResumoPop[] }) {
  const [indice, setIndice] = useState(0);
  const [historico, setHistorico] = useState<Pop[]>(() => [pops[0]]);
  const [posicao, setPosicao] = useState(0);
  const [carregandoReferencia, setCarregandoReferencia] = useState<string | null>(null);
  const [erroReferencia, setErroReferencia] = useState<string | null>(null);
  const referenciaRequest = useRef<AbortController | null>(null);
  useEffect(() => () => referenciaRequest.current?.abort(), []);
  const cache = useRef(new Map(pops.map((pop) => [pop.numero, pop])));
  const atual = historico[posicao] ?? pops[Math.min(indice, pops.length - 1)];

  const selecionarResultado = (novoIndice: number) => {
    const selecionado = pops[novoIndice];
    setIndice(novoIndice);
    setHistorico([selecionado]);
    setPosicao(0);
    setErroReferencia(null);
  };

  const abrirReferencia = async (numero: string) => {
    if (carregandoReferencia || numero === atual.numero) return;
    const controller = new AbortController();
    referenciaRequest.current = controller;
    setCarregandoReferencia(numero);
    setErroReferencia(null);
    try {
      let destino = cache.current.get(numero);
      if (!destino) {
        destino = validatePop(await requestJson<unknown>(`/api/pop/${encodeURIComponent(numero)}`, { signal: controller.signal }));
        cache.current.set(numero, destino);
      }
      if (controller.signal.aborted) return;
      const novoHistorico = [...historico.slice(0, posicao + 1), destino];
      setHistorico(novoHistorico);
      setPosicao(novoHistorico.length - 1);
    } catch (error) {
      if (!controller.signal.aborted) setErroReferencia(error instanceof Error ? error.message : 'Não foi possível abrir o POP relacionado.');
    } finally {
      if (!controller.signal.aborted) setCarregandoReferencia(null);
    }
  };

  return (
    <div className="space-y-4">
      {pops.length > 1 && (
          <ResultChoices
            label={`POPs encontrados (${pops.length})`}
            value={String(indice)}
            onChange={(value) => selecionarResultado(Number(value))}
            hint="Confira os procedimentos encontrados e selecione qual deseja ler."
            options={pops.map((pop, i) => ({ value: String(i), title: `POP ${pop.numero}`, description: pop.titulo }))}
          />
      )}
      {historico.length > 1 && (
        <nav className="rounded-control border border-ds-line bg-ds-surface p-3" aria-label="Histórico de POPs consultados">
          <p className="text-xs font-semibold text-ds-subtle">{historico.map((pop) => `POP ${pop.numero}`).join(' → ')}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-secondary btn-sm" disabled={posicao === 0} onClick={() => setPosicao((valor) => valor - 1)}>
              <Icone nome="voltar" tamanho={16} /> POP anterior
            </button>
            <button type="button" className="btn-secondary btn-sm" disabled={posicao >= historico.length - 1} onClick={() => setPosicao((valor) => valor + 1)}>
              Próximo POP <Icone nome="seta" tamanho={16} />
            </button>
            <button type="button" className="btn-secondary btn-sm" disabled={posicao === 0} onClick={() => setPosicao(0)}>
              Voltar ao POP inicial
            </button>
          </div>
        </nav>
      )}
      {carregandoReferencia && <p className="text-sm text-ds-subtle" role="status">Abrindo POP {carregandoReferencia}…</p>}
      {erroReferencia && <p className="alert-error" role="alert">{erroReferencia}</p>}
      {typeof atual.scoreConfianca === 'number' && (
        <p className="badge-neutral w-fit">{atual.scoreConfianca}% · {ROTULO_METODO[atual.metodoEncontrado ?? ''] ?? 'correspondência'}</p>
      )}
      <FichaPop pop={atual} catalogo={catalogo} onAbrirReferencia={(numero) => void abrirReferencia(numero)} />
    </div>
  );
}

export function PopsSugeridos({
  sugestoes,
  onSelect,
}: {
  sugestoes: Array<{ numero: string; titulo: string }>;
  onSelect: (valor: string) => void;
}) {
  if (sugestoes.length === 0) return null;
  return (
    <section className="rounded-control border border-ds-line bg-ds-surface p-4" aria-label="Sugestões próximas de POPs">
      <p className="font-semibold text-ds-text">Sugestões próximas — confira antes de selecionar</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {sugestoes.map((pop) => (
          <button key={pop.numero} type="button" className="chip" onClick={() => onSelect(`POP ${pop.numero}`)}>
            POP {pop.numero} — {pop.titulo}
          </button>
        ))}
      </div>
    </section>
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
export default function PopConsulta({ catalogo = [] }: { catalogo?: ResumoPop[] }) {
  const request = useRef<AbortController | null>(null);
  const ultimaPergunta = useRef('');
  useEffect(() => () => request.current?.abort(), []);
  const [pergunta, setPergunta] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<RespostaPop | null>(null);
  const segundos = useSegundos(carregando);
  const ditado = useDitado({ onTranscricao: (texto) => setPergunta((atual) => (atual ? `${atual} ${texto}` : texto)) });

  const perguntar = async (entrada: string) => {
    if (carregando) return;
    const texto = entrada.trim();
    if (texto.length < 3) return;
    if (turnstileConfigurado && !token) {
      setErro('Aguarde a verificação anti-bot e tente novamente.');
      return;
    }

    const controller = new AbortController();
    request.current = controller;
    ultimaPergunta.current = texto;
    setCarregando(true);
    setErro(null);
    setResultado(null);
    try {
      const corpo = await requestJson<RespostaPop>('/api/pop/consulta', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: texto, turnstileToken: token ?? undefined }),
      }, 25000);
      if (!corpo || !Array.isArray(corpo.fontes) || typeof corpo.semResposta !== 'boolean' || (corpo.pops !== undefined && (!Array.isArray(corpo.pops) || !corpo.pops.every(isPop)))) {
        throw new RequestError('invalid-response', 'O serviço retornou uma resposta inválida. Tente novamente.');
      }
      if (controller.signal.aborted) return;
      setResultado(corpo as RespostaPop);
    } catch (error) {
      if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      if (!controller.signal.aborted) setCarregando(false);
    }
  };

  return (
    <div className="min-w-0 space-y-5">
      <SectionCard titulo="Consultar procedimentos" icone="busca" className="consultation-card">
        <ConsultaModes atual="pop" />
        <form
          className="space-y-4"
          aria-busy={carregando}
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
              onChange={(e) => {
                setPergunta(e.target.value);
                setErro(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void perguntar(pergunta);
                }
              }}
              rows={4}
              maxLength={500}
              enterKeyHint="search"
              placeholder="Ex: Como proceder na abordagem a veículo suspeito?"
              controlClassName="min-h-[124px] resize-y leading-relaxed"
              hint="Use número, assunto, parte da palavra ou termos como “baculejo”, “blitz” e “encontrado morto”. Enter consulta; Shift + Enter cria uma nova linha."
              acao={<BotaoVoz ditado={ditado} />}
            />
            <AvisoVoz ditado={ditado} />
            <SearchSuggestions
              query={pergunta}
              fonte="pop"
              disabled={carregando}
              onSelect={(valor) => {
                setPergunta(valor);
                void perguntar(valor);
              }}
            />
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
          <div className="border-t border-ds-line pt-4">
            <p className="mb-2 text-xs font-semibold text-ds-subtle">Experimente uma pergunta</p>
            <div className="flex flex-wrap gap-2">
              {EXEMPLOS.map((exemplo) => (
                <button
                  key={exemplo}
                  type="button"
                  className="chip query-example"
                  disabled={carregando}
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
            {segundos < 2 ? 'Buscando nos POPs…' : 'Preparando a resposta…'}
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
          <div><p>{erro}</p><button type="button" className="btn-secondary mt-3" onClick={() => void perguntar(ultimaPergunta.current)}>Tentar novamente</button><p className="mt-3 text-sm">Consulte o manual disponível abaixo e confirme o procedimento vigente antes de agir.</p></div>
        </div>
      )}

      {catalogo.length > 0 && (
        <SectionCard titulo="Consultar o manual disponível" icone="livro">
          <p className="mb-3 text-sm text-ds-subtle">Acesso ao conteúdo do manual incluído no projeto, sem depender da geração de resposta. Confira a versão vigente antes de agir.</p>
          <ManualDisponivel catalogo={catalogo} />
        </SectionCard>
      )}

      {resultado && (
        <div className="space-y-5">
          {resultado.pops && resultado.pops.length > 0 && (
            <PopsEncontrados key={resultado.pergunta} pops={resultado.pops} catalogo={catalogo} />
          )}
          {resultado.resposta && !resultado.semResposta && (
            <SectionCard
              numero={2}
              titulo="Resumo da IA"
              acao={
                <span className="badge-neutral" title={resultado.modelo ?? undefined}>
                  {resultado.cache_hit ? 'da memória temporária' : 'gerada por IA'}
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
                  Tente outras palavras (ex.: o nome do procedimento) ou peça ao administrador para anexar o POP correspondente.
                </p>
              </div>
            </div>
          )}

          <PopsSugeridos
            sugestoes={resultado.sugestoes ?? []}
            onSelect={(valor) => {
              setPergunta(valor);
              void perguntar(valor);
            }}
          />

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

function ManualDisponivel({ catalogo }: { catalogo: ResumoPop[] }) {
  const [numero, setNumero] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [pop, setPop] = useState<Pop | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  useEffect(() => {
    if (!numero) {
      setPop(null); setErro(null); setCarregando(false);
      return;
    }
    const controller = new AbortController();
    setCarregando(true); setErro(null); setPop(null);
    requestJson<Pop>(`/api/pop/${encodeURIComponent(numero)}`, { signal: controller.signal })
      .then((value) => { const valid = validatePop(value); if (!controller.signal.aborted) setPop(valid); })
      .catch((error) => { if (!controller.signal.aborted) setErro(error instanceof Error ? error.message : 'Não foi possível abrir o manual.'); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [numero, tentativa]);
  return <div className="space-y-3">
    <label htmlFor="manual-pop" className="block text-sm font-semibold">Selecione o procedimento</label>
    <select id="manual-pop" className="w-full min-w-0 rounded-lg border border-ds-line bg-ds-surface p-3 text-ds-text" value={numero} onChange={(e) => setNumero(e.target.value)}>
      <option value="">Escolher POP</option>
      {catalogo.map((item) => <option key={item.numero} value={item.numero}>POP {item.numero} — {item.titulo}</option>)}
    </select>
    {carregando && <p role="status">Abrindo procedimento…</p>}
    {erro && <div role="alert"><p>{erro}</p><button type="button" className="btn-secondary mt-2" onClick={() => setTentativa((atual) => atual + 1)}>Tentar novamente</button></div>}
    {pop && <PopsEncontrados key={pop.numero} pops={[pop]} catalogo={catalogo} />}
  </div>;
}
