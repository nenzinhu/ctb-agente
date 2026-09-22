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
          setMessage({
            type: 'error',
            text: `Invalid file: ${file.name}. Supported formats: PDF, DOCX, TXT`,
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
            const error = await response.json();
            throw new Error(error.error || 'Upload failed');
          }

          const data = await response.json();
          console.log('Upload successful:', data);

          setProgress(((i + 1) / files.length) * 100);

          if (i === files.length - 1) {
            setMessage({
              type: 'success',
              text: `Successfully uploaded ${files.length} file(s)`,
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
            text: `Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

    // Max file size: 50MB
    const maxSize = 50 * 1024 * 1024;
    const hasValidSize = file.size <= maxSize;

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
            Drag and drop files here
          </p>
          <p className="text-sm text-gray-500 mb-4">
            or click to select files
          </p>
          <p className="text-xs text-gray-400">
            Supported: PDF, DOCX, TXT (max 50MB)
          </p>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">Uploading...</p>
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
