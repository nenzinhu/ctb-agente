'use client';

import { useEffect, useRef, useState } from 'react';
import { baixarArquivo } from '@/lib/download';
import { formatBytes } from '@/lib/ingestion/compress-client';
import type { NivelCompressao, ResultadoCompressao } from '@/lib/pdf-tools/compressor';
import Icone from '../ui/Icone';
import SectionCard from '../ui/SectionCard';

const NIVEIS: { valor: NivelCompressao; titulo: string; texto: string; destaque?: string }[] = [
  {
    valor: 'texto',
    titulo: 'Máxima — somente texto',
    texto: 'Tira imagens, fontes e formatação e deixa só o texto. O menor arquivo possível, sem problemas para indexar. Também gera um .txt.',
    destaque: 'Menor tamanho',
  },
  {
    valor: 'forte',
    titulo: 'Forte',
    texto: 'Mantém a aparência com mais compressão. Ideal para PDFs escaneados ou cheios de imagens.',
  },
  {
    valor: 'leve',
    titulo: 'Leve',
    texto: 'Mantém a aparência com boa qualidade de imagem. O texto continua pesquisável.',
  },
];

/**
 * PDF compressor that runs on the device (lib/pdf-tools/compressor.ts).
 */
export default function CompressorPdf() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [nivel, setNivel] = useState<NivelCompressao>('texto');
  const [progresso, setProgresso] = useState<{ feito: number; total: number } | null>(null);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoCompressao | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [suportado, setSuportado] = useState(true);

  useEffect(() => {
    setSuportado(typeof Worker !== 'undefined' && typeof document.createElement('canvas').getContext === 'function');
  }, []);

  const escolher = (lista: FileList | null) => {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    if (!/\.pdf$/i.test(escolhido.name) && escolhido.type !== 'application/pdf') {
      setErro('Escolha um arquivo PDF.');
      return;
    }
    setArquivo(escolhido);
    setResultado(null);
    setErro(null);
  };

  const comprimir = async (escolhido: NivelCompressao = nivel) => {
    if (!arquivo) return;
    setNivel(escolhido);
    setProcessando(true);
    setErro(null);
    setResultado(null);
    setProgresso({ feito: 0, total: 0 });
    try {
      // pdf.js (~1 MB) is only loaded when someone actually compresses.
      const { comprimirPdf } = await import('@/lib/pdf-tools/compressor');
      setResultado(await comprimirPdf(arquivo, escolhido, (feito, total) => setProgresso({ feito, total })));
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível comprimir o PDF.');
    } finally {
      setProcessando(false);
      setProgresso(null);
    }
  };

  const reducao = resultado && !resultado.semGanho
    ? Math.max(0, Math.round((1 - resultado.bytesFinais / resultado.bytesOriginais) * 100))
    : 0;
  const porcentagem = progresso && progresso.total > 0 ? Math.round((progresso.feito / progresso.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {!suportado && (
        <div className="alert-warn">
          <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-warn" />
          <p>Este navegador não consegue processar PDFs localmente. Use uma versão recente do Chrome, Edge, Firefox ou Safari.</p>
        </div>
      )}

      <SectionCard numero={1} titulo="Arquivo e nível">
        <div className="space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            if (!processando) escolher(e.dataTransfer.files);
          }}
          className={`flex flex-col items-center gap-3 rounded-control border-2 border-dashed px-6 py-8 text-center transition-colors ${
            arrastando ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-border-input bg-ds-muted'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => escolher(e.currentTarget.files)}
            aria-label="Selecionar PDF"
          />
          <span className="grid h-12 w-12 place-items-center rounded-control border-2 border-ds-primary bg-ds-surface text-ds-primary">
            <Icone nome="comprimir" tamanho={24} />
          </span>
          {arquivo ? (
            <div>
              <p className="break-all font-semibold text-ds-text">{arquivo.name}</p>
              <p className="mt-0.5 text-sm text-ds-subtle">{formatBytes(arquivo.size)}</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-ds-text">Arraste um PDF para cá</p>
              <p className="mt-0.5 text-sm text-ds-subtle">O arquivo não sai do seu aparelho.</p>
            </div>
          )}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => inputRef.current?.click()}
            disabled={processando}
          >
            {arquivo ? 'Trocar arquivo' : 'Escolher PDF'}
          </button>
        </div>

        <fieldset>
          <legend className="label">Nível de compressão</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {NIVEIS.map((opcao) => (
              <label
                key={opcao.valor}
                className={`relative flex cursor-pointer flex-col gap-1 rounded-control border-2 p-4 transition-colors ${
                  nivel === opcao.valor ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-line hover:bg-ds-muted'
                }`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="nivel"
                    value={opcao.valor}
                    checked={nivel === opcao.valor}
                    onChange={() => setNivel(opcao.valor)}
                    disabled={processando}
                    className="accent-ds-primary"
                  />
                  <span className="font-semibold text-ds-text">{opcao.titulo}</span>
                </span>
                {opcao.destaque && <span className="badge-brand w-fit">{opcao.destaque}</span>}
                <span className="text-sm text-ds-subtle">{opcao.texto}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <button
          type="button"
          className="btn-primary w-full text-base"
          onClick={() => comprimir()}
          disabled={!arquivo || processando || !suportado}
        >
          <Icone nome="comprimir" tamanho={18} />
          {processando ? 'Comprimindo…' : 'Comprimir PDF'}
        </button>

        {processando && (
          <div role="status" aria-live="polite">
            <div className="flex justify-between text-sm">
              <span className="text-ds-text">
                {progresso && progresso.total > 0 ? `Página ${progresso.feito} de ${progresso.total}` : 'Abrindo o PDF…'}
              </span>
              <span className="text-ds-subtle">{porcentagem}%</span>
            </div>
            <div
              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ds-line"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentagem}
              aria-label="Progresso da compressão"
            >
              <div className="h-full rounded-full bg-ds-primary transition-[width]" style={{ width: `${porcentagem}%` }} />
            </div>
          </div>
        )}

        {erro && (
          <div className="alert-error" role="alert">
            <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
            <p>{erro}</p>
          </div>
        )}
        </div>
      </SectionCard>

      {resultado && (
        <SectionCard numero={2} titulo={resultado.semGanho ? 'Este PDF já estava compacto' : 'PDF comprimido'}>
          <dl className="grid grid-cols-3 gap-3">
            <div className="stat">
              <dt className="stat-label">Antes</dt>
              <dd className="stat-value text-base sm:text-xl">{formatBytes(resultado.bytesOriginais)}</dd>
            </div>
            <div className="stat">
              <dt className="stat-label">Depois</dt>
              <dd className="stat-value text-base sm:text-xl">{formatBytes(resultado.bytesFinais)}</dd>
            </div>
            <div className="stat">
              <dt className="stat-label">Redução</dt>
              <dd className={`stat-value text-base sm:text-xl ${reducao > 0 ? 'text-ds-success' : 'text-ds-subtle'}`}>
                {reducao > 0 ? `−${reducao}%` : '0%'}
              </dd>
            </div>
          </dl>

          {resultado.semGanho && (
            <p className="mt-3 text-sm text-ds-subtle">
              Refazer as {resultado.paginas} páginas como imagem deixaria o arquivo maior. Para reduzir de verdade, use a
              compressão <strong>Máxima — somente texto</strong>.
            </p>
          )}

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            {resultado.semGanho ? (
              <button type="button" className="btn-primary" onClick={() => comprimir('texto')}>
                <Icone nome="comprimir" tamanho={18} />
                Comprimir com a Máxima
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={() => baixarArquivo(resultado.arquivo, resultado.nomeArquivo)}>
                <Icone nome="download" tamanho={18} />
                Baixar PDF
              </button>
            )}
            {resultado.txt && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => baixarArquivo(resultado.txt!.arquivo, resultado.txt!.nomeArquivo)}
              >
                <Icone nome="download" tamanho={18} />
                Baixar .txt
              </button>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
