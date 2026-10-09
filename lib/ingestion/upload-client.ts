// Browser side of document uploads, shared by the CTB panel and the POP-PMSC
// tab. The file goes browser → Supabase Storage directly, via a signed URL
// minted by /api/admin/documents/upload-url — it never passes through this
// app's Vercel functions, which reject bodies over 4.5MB before the route
// handler even runs. Once it lands in Storage, /api/ingestion/upload is told
// the storage path (a tiny JSON call) and does the actual parsing.
import { compressFile, compressionSupported, formatBytes } from './compress-client';
import { formatoDoArquivo, mimeParaEnvio } from './formats';
import type { Colecao } from './documents';

/**
 * nenhuma — the file as it is;
 * gzip    — lossless, restored on the server (big gain on TXT/DOC, little on PDF);
 * texto   — maximum: a PDF is turned into text in the browser before upload.
 */
export type Compressao = 'nenhuma' | 'gzip' | 'texto';

// Matches the documentos-pendentes Storage bucket's file_size_limit
// (scripts/migrations-006-documents-storage-bucket.sql). With compression on,
// that limit applies to the compressed bytes; the original may be larger.
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const MAX_COMPRESSED_SOURCE_BYTES = 100 * 1024 * 1024;
// A PDF converted to text in the browser only uploads its text.
const MAX_TEXT_SOURCE_BYTES = 300 * 1024 * 1024;

export function limiteDeOrigem(arquivo: File, compressao: Compressao): number {
  if (compressao === 'texto' && formatoDoArquivo(arquivo.name) === 'pdf') return MAX_TEXT_SOURCE_BYTES;
  if (compressao === 'gzip' && compressionSupported()) return MAX_COMPRESSED_SOURCE_BYTES;
  return MAX_UPLOAD_BYTES;
}

export interface EnvioOpcoes {
  colecao: Colecao;
  compressao: Compressao;
  fonteOficial: string;
  versao: string;
  vigenteDesde: string;
  conferidoEm: string;
  titulo?: string;
  normaId?: string;
  documentType?: string;
  onEtapa?: (etapa: string) => void;
}

export interface ResultadoEnvio {
  fileName: string;
  titulo?: string;
  duplicado: boolean;
  trechos: number;
  semVetor: number;
  avisoVetor?: string;
  substituidos: number;
  /** Compression applied, for the status line ("12 MB → 180 KB"). */
  nota?: string;
}

/**
 * Turn a failed fetch response into a message a person can act on.
 * A 413 body may be our own JSON or a platform-level plain-text rejection —
 * either way read the body as text first, since response.json() consumes
 * the stream even when parsing fails, and a body already read can't be
 * re-read as text.
 */
export async function describeUploadError(response: Response): Promise<string> {
  if (response.status === 413) {
    return 'Arquivo muito grande para o servidor.';
  }

  const raw = await response.text().catch(() => '');
  try {
    const error = JSON.parse(raw);
    return error.message || error.error || 'Falha no envio';
  } catch {
    return raw.slice(0, 200) || `Falha no envio (HTTP ${response.status})`;
  }
}

function semExtensao(nome: string): string {
  return nome.replace(/\.[^.]+$/, '');
}

/**
 * Uploads one file and has the server index it.
 * @throws With a message fit for the person uploading
 */
export async function enviarDocumento(original: File, opcoes: EnvioOpcoes): Promise<ResultadoEnvio> {
  let arquivo = original;
  let titulo = opcoes.titulo?.trim() || undefined;
  let nota: string | undefined;

  // 0a. Maximum compression: the PDF becomes plain text right here.
  if (opcoes.compressao === 'texto' && formatoDoArquivo(original.name) === 'pdf') {
    opcoes.onEtapa?.('Convertendo o PDF em texto');
    const { pdfParaTexto } = await import('@/lib/pdf-tools/compressor');
    arquivo = await pdfParaTexto(original, (feito, total) =>
      opcoes.onEtapa?.(`Convertendo o PDF em texto — página ${feito} de ${total}`)
    );
    titulo ??= semExtensao(original.name);
  }

  const contentType = mimeParaEnvio(arquivo.name) ?? (arquivo.type || 'application/octet-stream');

  // 0b. Gzip ("Sem perdas", and on top of the text in "Máxima"). The blob
  // keeps the original content type (the bucket only accepts document
  // types); the server recognizes gzip by its magic bytes and decompresses it.
  let body: Blob = arquivo;
  if (opcoes.compressao === 'gzip' || opcoes.compressao === 'texto') {
    opcoes.onEtapa?.('Comprimindo');
    const result = await compressFile(arquivo);
    if (result.compressed) body = new Blob([result.blob], { type: contentType });
  }
  if (body.size < original.size) {
    const saving = Math.round((1 - body.size / original.size) * 100);
    nota = `${formatBytes(original.size)} → ${formatBytes(body.size)} (−${saving}%${arquivo !== original ? ', somente texto' : ''})`;
  }

  if (body.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      opcoes.compressao === 'nenhuma'
        ? 'arquivo acima de 50 MB. Escolha uma compressão e tente de novo.'
        : `mesmo comprimido o arquivo tem ${formatBytes(body.size)} (limite de 50 MB).`
    );
  }

  // 1. Ask the server for a place to put the file.
  opcoes.onEtapa?.('Enviando');
  const urlResponse = await fetch('/api/admin/documents/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: arquivo.name, contentType }),
  });
  if (!urlResponse.ok) {
    throw new Error(await describeUploadError(urlResponse));
  }
  const { bucket, path, token } = (await urlResponse.json()) as { bucket: string; path: string; token: string };

  // 2. Upload the bytes directly to Supabase Storage — this is the step
  // that bypasses Vercel's request body limit entirely. supabase-js (~70 kB)
  // is only loaded here, so pages showing the form stay light.
  const { supabaseBrowser } = await import('@/lib/db/browser-client');
  const { error: storageError } = await supabaseBrowser.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, body, { contentType });
  if (storageError) {
    if (/mime type/i.test(storageError.message ?? '')) {
      throw new Error(
        'o armazenamento recusou este tipo de arquivo. Aplique a migração 008 (aceita .doc) ou envie em PDF/DOCX/TXT.'
      );
    }
    throw new Error(storageError.message || 'Falha ao enviar para o armazenamento.');
  }

  // 3. Tell the server to process what's now sitting in Storage.
  opcoes.onEtapa?.('Indexando');
  const ingestResponse = await fetch('/api/ingestion/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      storagePath: path,
      fileName: arquivo.name,
      colecao: opcoes.colecao,
      titulo,
      fonteOficial: opcoes.fonteOficial,
      versao: opcoes.versao,
      vigenteDesde: opcoes.vigenteDesde,
      conferidoEm: opcoes.conferidoEm,
      ...(opcoes.colecao === 'ctb' ? { normaId: opcoes.normaId, documentType: opcoes.documentType } : {}),
    }),
  });
  if (!ingestResponse.ok) {
    throw new Error(await describeUploadError(ingestResponse));
  }

  const result = (await ingestResponse.json()) as {
    duplicado?: boolean;
    data?: {
      titulo?: string;
      insertedCount?: number;
      failedCount?: number;
      semVetor?: number;
      avisoVetor?: string;
      substituidos?: number;
      chunkCount?: number;
    };
  };
  const data = result.data ?? {};

  // A 2xx only means the request completed, not that every chunk was saved.
  if (!result.duplicado && (data.failedCount ?? 0) > 0) {
    throw new Error(
      `${data.insertedCount ?? 0} trecho(s) importado(s), mas ${data.failedCount} falharam (ver logs do servidor).`
    );
  }

  return {
    fileName: original.name,
    titulo: data.titulo ?? titulo,
    duplicado: Boolean(result.duplicado),
    trechos: result.duplicado ? (data.chunkCount ?? 0) : (data.insertedCount ?? 0),
    semVetor: data.semVetor ?? 0,
    avisoVetor: data.avisoVetor,
    substituidos: data.substituidos ?? 0,
    nota,
  };
}
