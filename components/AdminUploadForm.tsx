'use client';

import { useState, useRef } from 'react';
import { supabaseBrowser } from '@/lib/db/browser-client';

/**
 * Admin upload form component
 * Handles drag & drop or file input for document uploads.
 *
 * The file goes browser → Supabase Storage directly, via a signed URL
 * minted by /api/admin/documents/upload-url — it never passes through this
 * app's Vercel functions, which reject bodies over 4.5MB before the route
 * handler even runs. Once it lands in Storage, /api/ingestion/upload is
 * told the storage path (a tiny JSON call) and does the actual parsing.
 */

interface UploadFormProps {
  onUploadSuccess?: () => void;
}

const DOCUMENT_TYPES = [
  { value: 'lei', label: 'Lei' },
  { value: 'resolucao', label: 'Resolução' },
  { value: 'portaria', label: 'Portaria' },
  { value: 'manual', label: 'Manual' },
] as const;

// Matches the documentos-pendentes Storage bucket's file_size_limit
// (scripts/migrations-006-documents-storage-bucket.sql).
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

/**
 * Turn a failed fetch response into a message a person can act on.
 * A 413 body may be our own JSON or a platform-level plain-text rejection —
 * either way read the body as text first, since response.json() consumes
 * the stream even when parsing fails, and a body already read can't be
 * re-read as text.
 */
async function describeUploadError(response: Response): Promise<string> {
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

export default function AdminUploadForm({ onUploadSuccess }: UploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // { current, total } file being processed. There's no per-chunk progress
  // from the server (it's one request per file that blocks until every
  // chunk is embedded and inserted), so this can only track which file is
  // active, not how far along it is — the bar below is intentionally
  // indeterminate rather than a fake percentage.
  const [fileProgress, setFileProgress] = useState<{ current: number; total: number } | null>(
    null
  );
  const [normaId, setNormaId] = useState('');
  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_TYPES)[number]['value']>('lei');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      uploadFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      uploadFiles(files);
    }
  };

  const uploadOne = async (file: File): Promise<void> => {
    // 1. Ask the server for a place to put the file.
    const urlResponse = await fetch('/api/admin/documents/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream' }),
    });

    if (!urlResponse.ok) {
      throw new Error(await describeUploadError(urlResponse));
    }

    const { bucket, path, token } = (await urlResponse.json()) as {
      bucket: string;
      path: string;
      token: string;
    };

    // 2. Upload the bytes directly to Supabase Storage — this is the step
    // that bypasses Vercel's request body limit entirely.
    const { error: storageError } = await supabaseBrowser.storage.from(bucket).uploadToSignedUrl(path, token, file);
    if (storageError) {
      throw new Error(storageError.message || 'Falha ao enviar para o armazenamento.');
    }

    // 3. Tell the server to process what's now sitting in Storage.
    const ingestResponse = await fetch('/api/ingestion/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storagePath: path, fileName: file.name, normaId, documentType }),
    });

    if (!ingestResponse.ok) {
      throw new Error(await describeUploadError(ingestResponse));
    }

    // A 2xx here only means the request completed, not that every chunk was
    // saved — some may have failed to embed while others succeeded.
    const result = (await ingestResponse.json()) as {
      data?: { insertedCount: number; failedCount: number };
    };
    if (result.data && result.data.failedCount > 0) {
      throw new Error(
        `${result.data.insertedCount} trecho(s) importado(s), mas ${result.data.failedCount} falharam (ver console/logs do servidor).`
      );
    }
  };

  const uploadFiles = async (files: FileList) => {
    if (!normaId.trim()) {
      setMessage({ type: 'error', text: 'Informe a norma antes de enviar o arquivo.' });
      return;
    }

    try {
      setIsUploading(true);
      setFileProgress({ current: 1, total: files.length });
      setMessage(null);

      // For now, we'll upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setFileProgress({ current: i + 1, total: files.length });

        // Validate file type and size
        if (!isValidFile(file)) {
          const tamanhoInvalido = file.size > MAX_UPLOAD_BYTES;
          setMessage({
            type: 'error',
            text: tamanhoInvalido
              ? `Arquivo muito grande: ${file.name} (limite de 50 MB por envio).`
              : `Arquivo inválido: ${file.name}. Formatos aceitos: PDF, DOCX, TXT (até 50 MB).`,
          });
          continue;
        }

        try {
          await uploadOne(file);

          if (i === files.length - 1) {
            setMessage({
              type: 'success',
              text: `${files.length} arquivo(s) enviado(s) com sucesso.`,
            });
            // Clear file input
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            // Trigger callback to refresh document list
            onUploadSuccess?.();
          }
        } catch (error) {
          console.error('Upload error:', error);
          setMessage({
            type: 'error',
            text: `Falha ao enviar ${file.name}: ${
              error instanceof Error ? error.message : 'erro desconhecido'
            }`,
          });
        }
      }
    } finally {
      setIsUploading(false);
      setFileProgress(null);
    }
  };

  const isValidFile = (file: File): boolean => {
    const validMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    const validExtensions = ['.pdf', '.docx', '.txt'];

    const hasValidMimeType = validMimeTypes.includes(file.type);
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    const hasValidSize = file.size <= MAX_UPLOAD_BYTES;

    return (hasValidMimeType || hasValidExtension) && hasValidSize;
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Norma</span>
          <input
            type="text"
            value={normaId}
            onChange={(e) => setNormaId(e.target.value)}
            placeholder="ex: ctb, res-432-2013"
            disabled={isUploading}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Tipo</span>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as typeof documentType)}
            disabled={isUploading}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
          >
            {DOCUMENT_TYPES.map((tipo) => (
              <option key={tipo.value} value={tipo.value}>
                {tipo.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          isDragging
            ? 'border-green-500 bg-green-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={isUploading}
          accept=".pdf,.docx,.txt"
          className="hidden"
        />

        <div onClick={() => !isUploading && fileInputRef.current?.click()}>
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v24a4 4 0 004 4h24a4 4 0 004-4V20m-8-12l-8 8m0 0l-8-8m8 8v20"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <p className="text-lg font-medium text-gray-900 mb-2">
            Arraste os arquivos para cá
          </p>
          <p className="text-sm text-gray-500 mb-4">
            ou clique para selecionar
          </p>
          <p className="text-xs text-gray-400">
            Aceitos: PDF, DOCX, TXT (até 50 MB)
          </p>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              Processando{fileProgress && fileProgress.total > 1 ? ` arquivo ${fileProgress.current} de ${fileProgress.total}` : ''}…
            </p>
          </div>
          {/* Indeterminate: the server does one blocking request per file
              with no per-chunk progress reporting, so a real percentage
              isn't available — a document with hundreds of trechos can take
              up to a minute, and a fake bar stuck at a fixed width reads as
              broken. */}
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-full bg-green-600 rounded-full animate-pulse" />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Documentos grandes podem levar até um minuto — não feche esta aba.
          </p>
        </div>
      )}

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
