'use client';

import { useState, useRef } from 'react';

/**
 * Admin upload form component
 * Handles drag & drop or file input for document uploads
 * Integrates with /api/ingestion/upload endpoint (Task 5)
 */

interface UploadFormProps {
  onUploadSuccess?: () => void;
}

// Vercel Serverless Functions reject request bodies over 4.5MB before the
// route handler runs (returns plain-text "Request Entity Too Large", not
// JSON) — this is a platform limit, not configurable from app code. Staying
// under it here means the person sees a clear message instead of a
// JSON-parse crash on a body we never controlled.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

/**
 * Turn a failed upload response into a message a person can act on.
 * A 413 body may be our own JSON or Vercel's plain-text platform rejection —
 * either way the file was too big. Anything else falls back to response.text()
 * since the body is not guaranteed to be JSON (a 500 from an upstream proxy,
 * for instance).
 */
async function describeUploadError(response: Response): Promise<string> {
  if (response.status === 413) {
    return 'Arquivo muito grande para o servidor (limite de 4 MB por envio).';
  }

  // Read the body once as text: response.json() consumes the stream even
  // when parsing fails, so a body already read can't be re-read as text.
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
  const [progress, setProgress] = useState(0);
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

  const uploadFiles = async (files: FileList) => {
    try {
      setIsUploading(true);
      setProgress(0);
      setMessage(null);

      // For now, we'll upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Validate file type and size
        if (!isValidFile(file)) {
          const tamanhoInvalido = file.size > MAX_UPLOAD_BYTES;
          setMessage({
            type: 'error',
            text: tamanhoInvalido
              ? `Arquivo muito grande: ${file.name} (limite de 4 MB por envio).`
              : `Arquivo inválido: ${file.name}. Formatos aceitos: PDF, DOCX, TXT (até 4 MB).`,
          });
          continue;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
          const response = await fetch('/api/ingestion/upload', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error(await describeUploadError(response));
          }

          const data = await response.json();
          console.log('Upload successful:', data);

          setProgress(((i + 1) / files.length) * 100);

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
            Aceitos: PDF, DOCX, TXT (até 4 MB)
          </p>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Enviando…</p>
            <p className="text-sm text-gray-500">{Math.round(progress)}%</p>
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
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
