'use client';

import { useState } from 'react';
import { baixarArquivo } from '@/lib/download';
import { pdfDeBlocos } from '@/lib/pdf-tools/pdf-writer';
import { blocosDaApostila, type Capitulo, type FonteApostila, type ItemApostila, type Publico } from '@/lib/rag/apostila';
import RespostaFormatada from './pop/RespostaFormatada';
import Field from './ui/Field';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import SectionCard from './ui/SectionCard';
import Stepper, { type Etapa } from './ui/Stepper';
import TitleCard from './ui/TitleCard';
import { cx } from './ui/cx';

const ETAPAS: Etapa[] = [
  { id: 'fonte', rotulo: 'Fonte' },
  { id: 'conteudo', rotulo: 'Conteúdo' },
  { id: 'gerar', rotulo: 'Gerar' },
];

const MAXIMO = 6;

const FONTES: { valor: FonteApostila; titulo: string; texto: string; exemplo: string }[] = [
  { valor: 'mbft', titulo: 'Fichas do MBFT', texto: 'Infrações de trânsito, uma ficha por capítulo.', exemplo: 'Ex.: estacionamento, art. 181, celular' },
  { valor: 'pop', titulo: 'POPs da PMSC', texto: 'Procedimentos operacionais padrão, um POP por capítulo.', exemplo: 'Ex.: abordagem, algemas, acidente' },
];

const PUBLICOS: { valor: Publico; titulo: string }[] = [
  { valor: 'agente', titulo: 'Agentes em formação' },
  { valor: 'leigo', titulo: 'Público leigo' },
];

/** Radio card used for the source and audience choices */
function Opcao({ nome, marcada, onChange, titulo, texto }: { nome: string; marcada: boolean; onChange: () => void; titulo: string; texto?: string }) {
  return (
    <label
      className={cx(
        'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border-2 p-3 text-sm transition-colors',
        marcada ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-line hover:bg-ds-muted'
      )}
    >
      <input type="radio" name={nome} checked={marcada} onChange={onChange} className="mt-0.5 h-4 w-4 shrink-0 accent-ds-primary" />
      <span>
        <span className="block font-semibold text-ds-text">{titulo}</span>
        {texto && <span className="block text-ds-subtle">{texto}</span>}
      </span>
    </label>
  );
}

/**
 * Study handout generator: pick the official items (MBFT sheets or POPs),
 * the AI writes one chapter per item, preview on screen and download as PDF.
 */
export default function GerarApostila() {
  const [fonte, setFonte] = useState<FonteApostila>('mbft');
  const [publico, setPublico] = useState<Publico>('agente');
  const [tema, setTema] = useState('');
  const [sugestoes, setSugestoes] = useState<ItemApostila[] | null>(null);
  const [escolhidos, setEscolhidos] = useState<ItemApostila[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [capitulos, setCapitulos] = useState<Capitulo[] | null>(null);

  const etapaAtual = escolhidos.length === 0 ? 1 : capitulos ? ETAPAS.length : 2;
  const fonteAtual = FONTES.find((f) => f.valor === fonte)!;

  const trocarFonte = (nova: FonteApostila) => {
    setFonte(nova);
    setSugestoes(null);
    setEscolhidos([]);
    setCapitulos(null);
  };

  const buscar = async () => {
    if (tema.trim().length < 2) return;
    setBuscando(true);
    setErro(null);
    try {
      const resposta = await fetch(`/api/apostila?fonte=${fonte}&tema=${encodeURIComponent(tema.trim())}`);
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.message || 'Não foi possível buscar.');
      setSugestoes(corpo.itens as ItemApostila[]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setBuscando(false);
    }
  };

  const alternar = (item: ItemApostila) => {
    setCapitulos(null);
    setEscolhidos((atual) =>
      atual.some((i) => i.id === item.id)
        ? atual.filter((i) => i.id !== item.id)
        : atual.length < MAXIMO
          ? [...atual, item]
          : atual
    );
  };

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    setCapitulos(null);
    try {
      const resposta = await fetch('/api/apostila', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fonte, publico, ids: escolhidos.map((i) => i.id) }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo?.message || 'Não foi possível gerar a apostila.');
      setCapitulos(corpo.capitulos as Capitulo[]);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Erro desconhecido.');
    } finally {
      setGerando(false);
    }
  };

  const tituloApostila = `Apostila — ${tema.trim() || fonteAtual.titulo}`;

  const baixar = async () => {
    if (!capitulos) return;
    const bytes = await pdfDeBlocos(tituloApostila, blocosDaApostila(capitulos));
    const nome = tituloApostila.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    baixarArquivo(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${nome}.pdf`);
  };

  return (
    <div className="space-y-6">
      <TitleCard
        titulo="Apostila por IA"
        icone="livro"
        subtitulo="Escolha fichas do MBFT ou POPs: a IA escreve um capítulo didático para cada um, com exemplos, questões e gabarito."
      />

      <Stepper etapas={ETAPAS} atual={etapaAtual} rotulo="Etapas da apostila" />

      <SectionCard numero={1} titulo="Fonte">
        <fieldset>
          <legend className="sr-only">Fonte da apostila</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {FONTES.map((f) => (
              <Opcao key={f.valor} nome="fonte" marcada={fonte === f.valor} onChange={() => trocarFonte(f.valor)} titulo={f.titulo} texto={f.texto} />
            ))}
          </div>
        </fieldset>
        <fieldset className="mt-4">
          <legend className="label">Público</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {PUBLICOS.map((p) => (
              <Opcao key={p.valor} nome="publico" marcada={publico === p.valor} onChange={() => { setPublico(p.valor); setCapitulos(null); }} titulo={p.titulo} />
            ))}
          </div>
        </fieldset>
      </SectionCard>

      <SectionCard numero={2} titulo="Conteúdo" acao={<span className="badge-neutral">{escolhidos.length}/{MAXIMO}</span>}>
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void buscar();
          }}
        >
          <Field label="Tema" className="min-w-0 flex-1" value={tema} onChange={(e) => setTema(e.target.value)} placeholder={fonteAtual.exemplo} maxLength={200} />
          <button type="submit" className="btn-secondary" disabled={buscando || tema.trim().length < 2}>
            <Icone nome="busca" tamanho={16} />
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {escolhidos.length > 0 && (
          <div className="mt-4">
            <p className="label">Capítulos, na ordem</p>
            <ol className="space-y-1.5">
              {escolhidos.map((item, i) => (
                <li key={item.id} className="flex items-start gap-2 text-sm text-ds-text">
                  <span className="font-mono font-bold text-ds-gold-strong">{i + 1}.</span>
                  <span className="min-w-0 flex-1">{item.titulo}</span>
                  <button type="button" className="text-xs font-semibold text-ds-danger underline" onClick={() => alternar(item)} aria-label={`Remover ${item.titulo}`}>
                    remover
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {sugestoes && (
          <fieldset className="mt-4">
            <legend className="label">Encontrados ({sugestoes.length})</legend>
            {sugestoes.length === 0 ? (
              <p className="text-sm text-ds-subtle">Nada encontrado. Tente outras palavras, um código ou um artigo.</p>
            ) : (
              <div className="grid gap-2">
                {sugestoes.map((item) => {
                  const marcado = escolhidos.some((i) => i.id === item.id);
                  return (
                    <label
                      key={item.id}
                      className={cx(
                        'flex min-h-[44px] cursor-pointer items-start gap-3 rounded-control border-2 px-3 py-2.5 text-sm transition-colors',
                        marcado ? 'border-ds-primary bg-ds-primary-soft text-ds-text' : 'border-ds-line text-ds-text hover:bg-ds-muted'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={marcado}
                        disabled={!marcado && escolhidos.length >= MAXIMO}
                        onChange={() => alternar(item)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-ds-primary"
                      />
                      <span>{item.titulo}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </fieldset>
        )}
      </SectionCard>

      <SectionCard numero={3} titulo="Gerar">
        <div className="space-y-4">
          <p className="text-sm text-ds-subtle">
            Cada capítulo traz objetivos, explicação, passo a passo, exemplos práticos, questões de fixação e gabarito, sempre a partir do
            texto oficial. Pode levar até um minuto.
          </p>

          {erro && (
            <div className="alert-error" role="alert">
              <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
              <p>{erro}</p>
            </div>
          )}

          <PrimaryButton icone="faisca" carregando={gerando} textoCarregando="Escrevendo a apostila…" disabled={escolhidos.length === 0} onClick={gerar} className="w-full text-base">
            Gerar apostila
          </PrimaryButton>

          {capitulos && (
            <PrimaryButton icone="download" onClick={() => void baixar()} className="w-full text-base">
              Baixar PDF
            </PrimaryButton>
          )}
        </div>
      </SectionCard>

      {capitulos && (
        <section aria-labelledby="previa-apostila" className="space-y-4">
          <h2 id="previa-apostila" className="page-title">
            Prévia
          </h2>
          {capitulos.map((capitulo, i) => (
            <article key={capitulo.id} className="card card-pad">
              <div className="card-head">
                <h3 className="section-title">
                  <span className="section-number">{i + 1}.</span>
                  <span className="min-w-0">{capitulo.titulo}</span>
                </h3>
              </div>
              <RespostaFormatada texto={capitulo.texto.replace(/^#{1,6}\s*(.+)$/gm, '**$1**').replace(/^([a-d]\))\s/gm, '- $1 ')} />
              <p className="mt-4 border-t border-ds-line pt-2 text-xs text-ds-subtle">
                {capitulo.modelo
                  ? `Gerado por IA (${capitulo.modelo}) a partir do texto oficial. Não substitui a norma.`
                  : 'Nenhum modelo de IA respondeu: este capítulo traz o texto oficial, sem adaptação.'}
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
