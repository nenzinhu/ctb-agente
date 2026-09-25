'use client';

import { useRef, useState } from 'react';
import { compressionSupported, formatBytes } from '@/lib/ingestion/compress-client';
import { ACCEPT_DOCUMENTOS, FORMATOS_ACEITOS_TEXTO, formatoDoArquivo } from '@/lib/ingestion/formats';
import { enviarDocumento, limiteDeOrigem, type Compressao, type ResultadoEnvio } from '@/lib/ingestion/upload-client';
import type { Colecao } from '@/lib/ingestion/documents';
import Icone from './ui/Icone';

/**
 * Upload form for the document bases: the CTB (laws, resoluções, manuais) and
 * the POP-PMSC. Accepts PDF, DOC, DOCX, MD and TXT; see
 * lib/ingestion/upload-client.ts for the upload path.
 */

interface UploadFormProps {
  onUploadSuccess?: () => void;
  colecao?: Colecao;
  /** Single-column layout, for narrow places such as a sidebar. */
  compacto?: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'lei', label: 'Lei' },
  { value: 'resolucao', label: 'Resolução' },
  { value: 'portaria', label: 'Portaria' },
  { value: 'manual', label: 'Manual' },
] as const;

const COMPRESSOES: { value: Compressao; label: string; ajuda: string }[] = [
  {
    value: 'texto',
    label: 'Máxima — PDF só com o texto',
    ajuda: 'O PDF vira texto no próprio navegador e ainda é comprimido: arquivo mínimo e sem problemas de leitura. Recomendado para PDFs grandes.',
  },
  { value: 'gzip', label: 'Sem perdas', ajuda: 'Comprime o arquivo como está (ganho grande em TXT/DOC, pequeno em PDF).' },
  { value: 'nenhuma', label: 'Nenhuma', ajuda: 'Envia o arquivo original, até 50 MB.' },
];

/**
 * POPs only feed the text search, so "Máxima" loses nothing there and gets
 * any PDF through; the CTB base keeps the lossless default.
 */
function compressaoPadrao(colecao: Colecao): Compressao {
  if (colecao === 'pop' && typeof Worker !== 'undefined') return 'texto';
  return compressionSupported() ? 'gzip' : 'nenhuma';
}

export default function AdminUploadForm({ onUploadSuccess, colecao = 'ctb', compacto = false }: UploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [fileProgress, setFileProgress] = useState<{ current: number; total: number } | null>(null);
  const [normaId, setNormaId] = useState('');
  const [titulo, setTitulo] = useState('');
  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_TYPES)[number]['value']>('lei');
  const [compressao, setCompressao] = useState<Compressao>(() => compressaoPadrao(colecao));
  const [stage, setStage] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [erros, setErros] = useState<string[]>([]);
  const [resultados, setResultados] = useState<ResultadoEnvio[]>([]);

  const ehCtb = colecao === 'ctb';
  const idPrefixo = `envio-${colecao}`;

  const uploadFiles = async (files: FileList | File[]) => {
    const lista = Array.from(files);
    if (lista.length === 0) return;

    if (ehCtb && !normaId.trim()) {
      setErros(['Informe a norma antes de enviar o arquivo.']);
      return;
    }

    setIsUploading(true);
    setSucesso(null);
    setErros([]);
    setResultados([]);
    const enviados: ResultadoEnvio[] = [];
    const falhas: string[] = [];

    try {
      for (let i = 0; i < lista.length; i++) {
        const file = lista[i];
        setFileProgress({ current: i + 1, total: lista.length });
        setStage(null);

        if (!formatoDoArquivo(file.name)) {
          falhas.push(`Arquivo inválido: ${file.name}. Formatos aceitos: ${FORMATOS_ACEITOS_TEXTO}.`);
          continue;
        }
        const limite = limiteDeOrigem(file, compressao);
        if (file.size > limite) {
          falhas.push(
            `Arquivo muito grande: ${file.name} (limite de ${formatBytes(limite)} por envio${
              formatoDoArquivo(file.name) === 'pdf' && compressao !== 'texto'
                ? '; escolha a compressão "Máxima" para PDFs maiores'
                : ''
            }).`
          );
          continue;
        }

        try {
          enviados.push(
            await enviarDocumento(file, {
              colecao,
              compressao,
              // A custom title only makes sense for a single file.
              titulo: lista.length === 1 ? titulo : undefined,
              normaId: ehCtb ? normaId.trim() : undefined,
              documentType: ehCtb ? documentType : undefined,
              onEtapa: setStage,
            })
          );
          setResultados([...enviados]);
        } catch (error) {
          console.error('Upload error:', error);
          falhas.push(`Falha ao enviar ${file.name}: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
        }
      }
    } finally {
      setIsUploading(false);
      setFileProgress(null);
      setStage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    setErros(falhas);
    if (enviados.length > 0) {
      setSucesso(`${enviados.length} arquivo(s) enviado(s) com sucesso.`);
      onUploadSuccess?.();
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className={`grid gap-4 ${compacto ? '' : ehCtb ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {ehCtb && (
          <label className="block" htmlFor={`${idPrefixo}-norma`}>
            <span className="label">Norma</span>
            <input
              id={`${idPrefixo}-norma`}
              type="text"
              value={normaId}
              onChange={(e) => setNormaId(e.target.value)}
              placeholder="ex: ctb, res-432-2013"
              disabled={isUploading}
              className="input"
            />
          </label>
        )}

        {ehCtb && (
          <label className="block" htmlFor={`${idPrefixo}-tipo`}>
            <span className="label">Tipo</span>
            <select
              id={`${idPrefixo}-tipo`}
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as typeof documentType)}
              disabled={isUploading}
              className="input"
            >
              {DOCUMENT_TYPES.map((tipo) => (
                <option key={tipo.value} value={tipo.value}>
                  {tipo.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="block" htmlFor={`${idPrefixo}-titulo`}>
          <span className="label">Título (opcional)</span>
          <input
            id={`${idPrefixo}-titulo`}
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={ehCtb ? 'ex: Resolução 432/2013' : 'ex: POP 1.01 — Abordagem a pessoas'}
            disabled={isUploading}
            maxLength={200}
            className="input"
          />
        </label>

        {!ehCtb && (
          <p className={`hint ${compacto ? '-mt-2' : 'self-end pb-2'}`}>
            Sem título, usamos o nome do arquivo. Reenviar o mesmo arquivo substitui a versão anterior.
          </p>
        )}
      </div>

      <fieldset>
        <legend className="label">Compressão antes de enviar</legend>
        <div className={`grid gap-2 ${compacto ? '' : 'sm:grid-cols-3'}`}>
          {COMPRESSOES.map((opcao) => (
            <label
              key={opcao.value}
              className={`flex cursor-pointer gap-2.5 rounded-xl border p-3 text-sm transition-colors ${
                compressao === opcao.value ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-line hover:bg-ds-muted'
              }`}
            >
              <input
                type="radio"
                name={`${idPrefixo}-compressao`}
                value={opcao.value}
                checked={compressao === opcao.value}
                onChange={() => setCompressao(opcao.value)}
                disabled={isUploading || (opcao.value === 'gzip' && !compressionSupported())}
                className="mt-0.5 accent-ds-primary"
              />
              <span>
                <span className="block font-semibold text-ds-text">{opcao.label}</span>
                <span className="mt-0.5 block text-xs text-ds-subtle">{opcao.ajuda}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!isUploading && e.dataTransfer.files.length > 0) void uploadFiles(e.dataTransfer.files);
        }}
        className={`flex flex-col items-center gap-3 rounded-control border-2 border-dashed px-6 py-8 text-center transition-colors ${
          isDragging ? 'border-ds-primary bg-ds-primary-soft' : 'border-ds-border-input bg-ds-muted'
        } ${isUploading ? 'opacity-60' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => {
            const files = e.currentTarget.files;
            if (files && files.length > 0) void uploadFiles(files);
          }}
          disabled={isUploading}
          accept={ACCEPT_DOCUMENTOS}
          className="hidden"
          aria-label="Selecionar documentos"
        />
        <span className="grid h-12 w-12 place-items-center rounded-control border-2 border-ds-primary bg-ds-surface text-ds-primary">
          <Icone nome="upload" tamanho={24} />
        </span>
        <div>
          <p className="font-semibold text-ds-text">Arraste os arquivos para cá</p>
          <p className="mt-0.5 text-sm text-ds-subtle">
            {FORMATOS_ACEITOS_TEXTO} · vários de uma vez
          </p>
        </div>
        <button
          type="button"
          className="btn-secondary"
          disabled={isUploading}
          onClick={() => fileInputRef.current?.click()}
        >
          Escolher arquivos
        </button>
      </div>

      {isUploading && (
        <div className="panel p-4" role="status" aria-live="polite">
          <p className="text-sm font-medium text-ds-text">
            {stage ?? 'Processando'}
            {fileProgress && fileProgress.total > 1 ? ` · arquivo ${fileProgress.current} de ${fileProgress.total}` : ''}…
          </p>
          {/* Indeterminate: the server does one blocking request per file
              with no per-chunk progress reporting, so a real percentage
              isn't available — a fake bar stuck at a fixed width reads as
              broken. */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ds-line">
            <div className="h-full w-1/3 animate-pulse rounded-full bg-ds-primary" />
          </div>
          <p className="hint">Documentos grandes podem levar até um minuto — não feche esta aba.</p>
        </div>
      )}

      {sucesso && (
        <div className="alert-success" role="status">
          <Icone nome="check" className="mt-0.5 shrink-0 text-ds-success" />
          <div className="min-w-0">
            <p className="font-semibold">{sucesso}</p>
            <ul className="mt-1 space-y-1 text-ds-subtle">
              {resultados.map((r) => (
                <li key={r.fileName} className="break-words">
                  <span className="font-medium text-ds-text">{r.titulo ?? r.fileName}</span>:{' '}
                  {r.duplicado
                    ? 'já estava indexado, nada mudou'
                    : `${r.trechos} trechos indexados${r.substituidos > 0 ? ', versão anterior substituída' : ''}`}
                  {r.nota ? ` · ${r.nota}` : ''}
                  {!r.duplicado && r.semVetor > 0 && (
                    <span className="block text-xs">
                      {r.semVetor} trecho(s) ainda sem vetor semântico — a busca por palavras já funciona; gere os vetores
                      em “Vetores pendentes”.
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {erros.map((erro) => (
        <div key={erro} className="alert-error" role="alert">
          <Icone nome="alerta" className="mt-0.5 shrink-0 text-ds-danger" />
          <p className="min-w-0 break-words">{erro}</p>
        </div>
      ))}
    </div>
  );
}
