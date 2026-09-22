'use client';

import React, { useState, useRef } from 'react';

interface UploadFormProps {
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
}

export function UploadForm({ onSuccess, onError }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [normaId, setNormaId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('lei');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        setProgress('Error: File type not supported. Use PDF, DOCX, or TXT');
        setFile(null);
        return;
      }

      // Validate file size (50MB)
      if (selectedFile.size > 50 * 1024 * 1024) {
        setProgress('Error: File too large (max 50MB)');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setProgress('');
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file || !normaId) {
      setProgress('Error: Please select a file and enter a norm ID');
      return;
    }

    setLoading(true);
    setProgress('Uploading and processing document...');

    try {
      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append(
        'metadata',
        JSON.stringify({
          normaId,
          documentType,
          dataPublicacao: new Date().toISOString(),
          dataVigenciaInicio: new Date().toISOString(),
        }),
      );

      // Send to API
      const response = await fetch('/api/ingestion/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setProgress(
        `Success! Processed ${result.data.chunkCount} chunks, inserted ${result.data.insertedCount} records`,
      );

      // Reset form
      setFile(null);
      setNormaId('');
      setDocumentType('lei');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      onSuccess?.(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setProgress(`Error: ${errorMessage}`);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md"
    >
      <h2 className="text-2xl font-bold mb-6">Upload Document</h2>

      {/* File input */}
      <div className="mb-4">
        <label
          htmlFor="file"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Document (PDF, DOCX, or TXT)
        </label>
        <input
          ref={fileInputRef}
          type="file"
          id="file"
          accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={handleFileSelect}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
        />
        {file && (
          <p className="mt-2 text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
          </p>
        )}
      </div>

      {/* Norm ID input */}
      <div className="mb-4">
        <label
          htmlFor="normaId"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Norm ID (e.g., CTB, MBFT, Res. 123/2021)
        </label>
        <input
          type="text"
          id="normaId"
          value={normaId}
          onChange={(e) => setNormaId(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
          placeholder="CTB"
        />
      </div>

      {/* Document type select */}
      <div className="mb-4">
        <label
          htmlFor="documentType"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Document Type
        </label>
        <select
          id="documentType"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
        >
          <option value="lei">Law (Lei)</option>
          <option value="resolucao">Resolution (Resolução)</option>
          <option value="portaria">Portaria</option>
          <option value="manual">Manual</option>
        </select>
      </div>

      {/* Progress message */}
      {progress && (
        <div
          className={`mb-4 p-3 rounded text-sm ${
            progress.startsWith('Error')
              ? 'bg-red-50 text-red-800 border border-red-200'
              : progress.startsWith('Success')
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-blue-50 text-blue-800 border border-blue-200'
          }`}
        >
          {progress}
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading || !file || !normaId}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
      >
        {loading ? 'Processing...' : 'Upload & Process'}
      </button>
    </form>
  );
}
