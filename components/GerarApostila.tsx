'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { requestJson, RequestError } from '@/lib/client/request';
import { baixarArquivo } from '@/lib/download';
import { pdfDeBlocos } from '@/lib/pdf-tools/pdf-writer';
import { blocosDaApostila } from '@/lib/rag/apostila';
import {
  MAXIMO_PAGINAS_APOSTILA,
  parseSelecaoPaginas,
  SelecaoPaginasInvalida,
} from '@/lib/apostila/paginas';
import type { CapituloApostila, DocumentoApostila, PublicoApostila, SelecaoApostila } from '@/lib/apostila/tipos';
import RespostaFormatada from './pop/RespostaFormatada';
import Field from './ui/Field';
import Icone from './ui/Icone';
import PrimaryButton from './ui/PrimaryButton';
import SectionCard from './ui/SectionCard';
import Stepper, { type Etapa } from './ui/Stepper';
import TitleCard from './ui/TitleCard';
import { cx } from './ui/cx';

const ETAPAS: Etapa[] = [
  { id: 'documento', rotulo: 'Documento' },
  { id: 'conteudo', rotulo: 'Conteúdo' },
  { id: 'gerar', rotulo: 'Gerar' },
];

const COLECOES: Record<DocumentoApostila['colecao'], string> = {
  ctb: 'CTB / MBFT',
  pop: 'POP',
  natureza_potencial: 'Fatos PMSC',
  estrangeiros: 'Estrangeiros',
};

type Resultado = {
  titulo: string;
  selecaoRotulo: string;
  documento: DocumentoApostila;
  capitulos: CapituloApostila[];
};

function Opcao({ nome, valor, marcada, onChange, titulo, texto, disabled = false }: {
  nome: string;
  valor: string;
  marcada: boolean;
  onChange: () => void;
  titulo: string;
  texto?: string;
  disabled?: boolean;
}) {
  return (
    <label className={cx(
      'flex min-h-[44px] items-start gap-3 rounded-control border-2 p-3 text-sm transition-colors',
      disabled ? 'cursor-not-allowed border-ds-line opacity-60' : 'cursor-pointer',
      marcada ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-line hover:bg-ds-muted'
    )}>
      <input
        type="radio"
        name={nome}
        value={valor}
        aria-label={titulo}
        checked={marcada}
        disabled={disabled}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 accent-ds-primary"
      />
      <span>
        <span className="block font-semibold text-ds-text">{titulo}</span>
        {texto && <span className="block text-ds-subtle">{texto}</span>}
      </span>
    </label>
  );
}

export default function GerarApostila() {
  const catalogRequest = useRef<AbortController | null>(null);
  const generationRequest = useRef<AbortController | null>(null);
  const ultimaBusca = useRef('');
  const [erroCatalogo, setErroCatalogo] = useState<string | null>(null);
  const [falhaGeracao, setFalhaGeracao] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentoApostila[]>([]);
  const [documentoId, setDocumentoId] = useState<string | null>(null);
  const [consulta, setConsulta] = useState('');
  const [modo, setModo] = useState<SelecaoApostila['modo']>('inteiro');
  const [intervalos, setIntervalos] = useState('');
  const [publico, setPublico] = useState<PublicoApostila>('agente');
  const [titulo, setTitulo] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const documento = useMemo(
    () => documentos.find((item) => item.id === documentoId) ?? null,
    [documentoId, documentos]
  );
  const permiteDocumentoInteiro = documento?.paginas !== null
    && documento?.paginas !== undefined
    && documento.paginas <= MAXIMO_PAGINAS_APOSTILA;
  const selecaoDisponivel = modo === 'inteiro'
    ? permiteDocumentoInteiro
    : documento?.paginaMaximaDisponivel !== null && documento?.paginaMaximaDisponivel !== undefined;
  const etapaAtual = documento ? (resultado ? 2 : 1) : 0;

  const carregar = async (termo = '') => {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    ultimaBusca.current = termo;
    setCarregando(true);
    setErroCatalogo(null);
    try {
      const url = termo ? `/api/apostila?q=${encodeURIComponent(termo)}` : '/api/apostila';
      const corpo = await requestJson<{ documentos: DocumentoApostila[]; bancoConfigurado: boolean }>(url, { signal: controller.signal });
      if (!corpo || !Array.isArray(corpo.documentos) || typeof corpo.bancoConfigurado !== 'boolean' || !corpo.documentos.every((item) => item && typeof item.id === 'string' && typeof item.titulo === 'string')) {
        throw new RequestError('invalid-response', 'O serviço retornou uma lista de documentos inválida. Tente novamente.');
      }
      if (controller.signal.aborted) return;
      if (!corpo.bancoConfigurado) throw new Error('O banco documental ainda não está configurado.');
      setDocumentos(corpo.documentos);
    } catch (error) {
      if (!controller.signal.aborted) setErroCatalogo(error instanceof Error ? error.message : 'Não foi possível carregar os documentos.');
    } finally {
      if (!controller.signal.aborted) setCarregando(false);
    }
  };

  useEffect(() => {
    void carregar();
    return () => { catalogRequest.current?.abort(); generationRequest.current?.abort(); };
  }, []);

  const escolherDocumento = (item: DocumentoApostila) => {
    generationRequest.current?.abort();
    setGerando(false);
    setFalhaGeracao(false);
    const inteiroDisponivel = item.paginas !== null
      && item.paginas <= MAXIMO_PAGINAS_APOSTILA;
    setDocumentoId(item.id);
    setModo(inteiroDisponivel ? 'inteiro' : 'paginas');
    setIntervalos('');
    setTitulo(`Apostila — ${item.titulo}`.slice(0, 120));
    setResultado(null);
    setErro(null);
  };

  const gerar = async () => {
    if (!documento) return;
    if (modo === 'paginas' && !intervalos.trim()) {
      setErro('Informe as páginas, por exemplo: 3, 10–18.');
      return;
    }
    if (modo === 'paginas') {
      try {
        parseSelecaoPaginas(intervalos, documento.paginaMaximaDisponivel ?? undefined);
      } catch (error) {
        setErro(error instanceof SelecaoPaginasInvalida
          ? error.message
          : 'Informe páginas válidas, como 3, 10–18.');
        return;
      }
    }
    generationRequest.current?.abort();
    const controller = new AbortController();
    generationRequest.current = controller;
    setFalhaGeracao(false);
    setGerando(true);
    setErro(null);
    setResultado(null);
    const selecao: SelecaoApostila = modo === 'inteiro'
      ? { modo: 'inteiro' }
      : { modo: 'paginas', intervalos: intervalos.trim() };
    try {
      const corpo = await requestJson<Resultado>('/api/apostila', {
        signal: controller.signal,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentoId: documento.id, selecao, publico, titulo: titulo.trim() }),
      }, 65000);
      if (!corpo || typeof corpo.titulo !== 'string' || typeof corpo.selecaoRotulo !== 'string' || !corpo.documento || !Array.isArray(corpo.capitulos) || !corpo.capitulos.every((capitulo) => capitulo && typeof capitulo.texto === 'string' && Array.isArray(capitulo.paginas))) {
        throw new RequestError('invalid-response', 'O serviço retornou uma apostila inválida. Tente novamente.');
      }
      if (!controller.signal.aborted) setResultado(corpo);
    } catch (error) {
      if (!controller.signal.aborted) {
        setErro(error instanceof Error ? error.message : 'Não foi possível gerar a apostila.');
        setFalhaGeracao(true);
      }
    } finally {
      if (!controller.signal.aborted) setGerando(false);
    }
  };

  const baixar = async () => {
    if (!resultado) return;
    setErro(null);
    try {
      const logo = await fetch('/brasao-cpmrv.jpg');
      if (!logo.ok) throw new Error('Não foi possível carregar o brasão da apostila.');
      const situacao = resultado.documento.situacao === 'revisar' ? 'Em revisão' : 'Vigente';
      const blocos = [
        { texto: `Documento de origem: ${resultado.documento.titulo}`, estilo: 'nota' as const },
        { texto: `Seleção: ${resultado.selecaoRotulo}`, estilo: 'nota' as const },
        { texto: `Situação documental: ${situacao}`, estilo: 'nota' as const },
        { texto: 'Material de apoio à consulta. Confirme a fonte e a revisão humana antes do uso operacional; esta apostila não substitui a norma.', estilo: 'nota' as const },
        ...blocosDaApostila(resultado.capitulos),
      ];
      const bytes = await pdfDeBlocos(resultado.titulo, blocos, undefined, {
        instituicao: 'Polícia Militar Rodoviária de Santa Catarina',
        logoJpeg: new Uint8Array(await logo.arrayBuffer()),
        logoLarguraPx: 115,
        logoAlturaPx: 144,
      });
      const nome = resultado.titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
      baixarArquivo(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${nome}.pdf`);
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível baixar a apostila.');
    }
  };

  return (
    <div className="space-y-6">
      <TitleCard
        titulo="Apostila por IA"
        icone="livro"
        subtitulo="Pesquise qualquer documento indexado e crie uma apostila didática do conteúdo inteiro ou de páginas selecionadas."
      />
      <Stepper etapas={ETAPAS} atual={etapaAtual} rotulo="Etapas da apostila" />

      <SectionCard numero={1} titulo="Documento">
        <form className="flex flex-col gap-2 sm:flex-row sm:items-end" onSubmit={(event) => {
          event.preventDefault();
          void carregar(consulta.trim());
        }}>
          <Field
            label="Pesquisar documentos"
            className="min-w-0 flex-1"
            value={consulta}
            onChange={(event) => setConsulta(event.target.value)}
            placeholder="Título, assunto, artigo ou palavra do conteúdo"
            maxLength={200}
          />
          <button type="submit" className="btn-secondary min-h-[44px]" disabled={carregando || gerando}>
            <Icone nome="busca" tamanho={16} />
            {carregando ? 'Pesquisando…' : 'Pesquisar'}
          </button>
        </form>

        <fieldset className="mt-4" disabled={gerando}>
          <legend className="label">Documentos encontrados</legend>
          {carregando ? (
            <p className="text-sm text-ds-subtle" role="status">Carregando documentos…</p>
          ) : erroCatalogo ? (
            <div className="alert-error" role="alert"><div><p>{erroCatalogo}</p><button type="button" className="btn-secondary mt-3" onClick={() => void carregar(ultimaBusca.current)}>Tentar novamente</button></div></div>
          ) : documentos.length === 0 ? (
            <p className="text-sm text-ds-subtle">Nenhum documento encontrado.</p>
          ) : (
            <div className="grid gap-2">
              {documentos.map((item) => (
                <label key={item.id} className={cx(
                  'flex min-h-[56px] cursor-pointer items-start gap-3 rounded-control border-2 px-3 py-3 text-sm transition-colors',
                  item.id === documentoId ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-line hover:bg-ds-muted'
                )}>
                  <input
                    type="radio"
                    name="documento"
                    aria-label={item.titulo}
                    checked={item.id === documentoId}
                    onChange={() => escolherDocumento(item)}
                    className="mt-1 h-4 w-4 shrink-0 accent-ds-primary"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ds-text">{item.titulo}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5 text-xs text-ds-subtle">
                      <span className="badge-neutral">{COLECOES[item.colecao]}</span>
                      <span>{item.paginas ? `${item.paginas} páginas` : 'Total de páginas não informado'}</span>
                      <span className={item.situacao === 'revisar' ? 'badge-media' : 'badge-brand'}>
                        {item.situacao === 'revisar' ? 'Em revisão' : 'Vigente'}
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </SectionCard>

      <SectionCard numero={2} titulo="Conteúdo">
        {!documento ? (
          <p className="text-sm text-ds-subtle">Escolha um documento para definir o conteúdo.</p>
        ) : (
          <fieldset className="space-y-4" disabled={gerando}>
            {documento.situacao === 'revisar' && (
              <div className="alert-warn" role="alert">
                <Icone nome="alerta" className="mt-0.5 shrink-0" />
                <p><strong>Documento em revisão.</strong> Confirme a fonte antes do uso operacional; o aviso também constará no PDF.</p>
              </div>
            )}
            <fieldset>
              <legend className="label">Extensão</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Opcao nome="modo" valor="inteiro" marcada={modo === 'inteiro'} onChange={() => { setModo('inteiro'); setResultado(null); }} titulo="Documento inteiro" texto={permiteDocumentoInteiro ? 'Disponível porque o documento possui até 10 páginas.' : 'Disponível somente para documentos com até 10 páginas.'} disabled={!permiteDocumentoInteiro} />
                <Opcao nome="modo" valor="paginas" marcada={modo === 'paginas'} onChange={() => { setModo('paginas'); setResultado(null); }} titulo="Páginas selecionadas" texto={documento.paginaMaximaDisponivel ? `Escolha manualmente até 10 páginas, entre 1 e ${documento.paginaMaximaDisponivel}.` : 'Páginas ainda não disponíveis.'} disabled={documento.paginaMaximaDisponivel === null} />
              </div>
            </fieldset>
            {!permiteDocumentoInteiro && documento.paginaMaximaDisponivel !== null && (
              <p className="hint">Selecione manualmente até 10 páginas por apostila.</p>
            )}
            {documento.paginaMaximaDisponivel === null && (
              <p className="hint">Este documento precisa ser reindexado para permitir a escolha manual de até 10 páginas.</p>
            )}
            {modo === 'paginas' && documento.paginaMaximaDisponivel !== null && (
              <Field
                label="Intervalos de páginas"
                value={intervalos}
                onChange={(event) => { setIntervalos(event.target.value); setResultado(null); }}
                placeholder="Ex.: 3, 10–18, 35–40"
                hint="Separe páginas ou intervalos com vírgulas. Máximo de 10 páginas por apostila."
                maxLength={200}
              />
            )}
            <Field label="Título da apostila" value={titulo} onChange={(event) => setTitulo(event.target.value)} maxLength={120} />
            <fieldset>
              <legend className="label">Público</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                <Opcao nome="publico" valor="agente" marcada={publico === 'agente'} onChange={() => setPublico('agente')} titulo="Agentes" />
                <Opcao nome="publico" valor="leigo" marcada={publico === 'leigo'} onChange={() => setPublico('leigo')} titulo="Público leigo" />
              </div>
            </fieldset>
            <div className="rounded-control border border-ds-line bg-ds-muted p-3 text-sm text-ds-text">
              <p className="font-semibold">Resumo da geração</p>
              <p>{documento.titulo}</p>
              <p>{modo === 'inteiro' ? 'Documento inteiro' : intervalos.trim() || 'Informe as páginas'}</p>
              <p>{documento.situacao === 'revisar' ? 'Em revisão — confirme a fonte' : 'Vigente'}</p>
            </div>
          </fieldset>
        )}
      </SectionCard>

      <SectionCard numero={3} titulo="Gerar">
        <div className="space-y-4">
          <p className="text-sm text-ds-subtle">A IA organiza somente o texto selecionado em explicações, exemplos didáticos, questões e gabarito. A fonte e as páginas permanecem identificadas.</p>
          {erro && <div className="alert-error" role="alert"><Icone nome="alerta" className="mt-0.5 shrink-0" /><div><p>{erro}</p>{falhaGeracao && <button type="button" className="btn-secondary mt-3" onClick={() => void gerar()}>Tentar novamente</button>}</div></div>}
          <PrimaryButton icone="faisca" carregando={gerando} textoCarregando="Escrevendo a apostila…" disabled={!documento || !titulo.trim() || !selecaoDisponivel} onClick={() => void gerar()} className="w-full text-base">
            Gerar apostila
          </PrimaryButton>
          {resultado && <PrimaryButton icone="download" onClick={() => void baixar()} className="w-full text-base">Baixar PDF</PrimaryButton>}
        </div>
      </SectionCard>

      {resultado && (
        <section aria-labelledby="previa-apostila" className="space-y-4">
          <h2 id="previa-apostila" className="page-title">Prévia</h2>
          <p className="text-sm text-ds-subtle">{resultado.documento.titulo} · {resultado.selecaoRotulo}</p>
          {resultado.capitulos.map((capitulo, indice) => (
            <article key={capitulo.id} className="card card-pad">
              <h3 className="section-title"><span className="section-number">{indice + 1}.</span><span>{capitulo.titulo}</span></h3>
              <p className="mt-2 text-xs text-ds-subtle">Páginas: {capitulo.paginas.join(', ') || 'não informadas'}</p>
              {capitulo.situacao === 'revisar' && <p className="mt-2 text-xs font-semibold text-ds-warn">Em revisão — confirme a fonte.</p>}
              <RespostaFormatada texto={capitulo.texto.replace(/^#{1,6}\s*(.+)$/gm, '**$1**').replace(/^([a-d]\))\s/gm, '- $1 ')} />
              <p className="mt-4 border-t border-ds-line pt-2 text-xs text-ds-subtle">
                {capitulo.modelo ? `Gerado por IA (${capitulo.modelo}) a partir do texto indexado.` : 'Texto da fonte, sem adaptação da IA.'} Não substitui a norma.
              </p>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
