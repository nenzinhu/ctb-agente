// Browser-side gzip for admin document uploads. The server side
// (lib/ingestion/decompress.ts) recognizes the result by gzip's magic bytes,
// so the upload keeps the original content type and the Storage bucket's
// allowed_mime_types (PDF/DOCX/TXT) don't need to change.

export interface CompressionResult {
  blob: Blob;
  compressed: boolean;
  originalBytes: number;
  finalBytes: number;
}

// PDFs and DOCX are already compressed internally (Flate streams / zip), so
// gzip often saves almost nothing on them. Below this saving, sending the
// original is simpler for the server and costs about the same bandwidth.
const MIN_SAVING_RATIO = 0.05;

export function compressionSupported(): boolean {
  return typeof CompressionStream !== 'undefined';
}

/**
 * Gzips a file in the browser, falling back to the original when the
 * browser can't compress or the saving isn't worth it.
 * @param file - File picked by the admin
 * @returns The blob to upload (typed like the original file) plus sizes
 */
export async function compressFile(file: File): Promise<CompressionResult> {
  const original: CompressionResult = {
    blob: file,
    compressed: false,
    originalBytes: file.size,
    finalBytes: file.size,
  };

  if (!compressionSupported() || file.size === 0) return original;

  try {
    const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
    const gz = await new Response(stream).blob();

    if (gz.size > file.size * (1 - MIN_SAVING_RATIO)) return original;

    return {
      blob: new Blob([gz], { type: file.type || 'application/octet-stream' }),
      compressed: true,
      originalBytes: file.size,
      finalBytes: gz.size,
    };
  } catch (error) {
    console.warn('Compression failed, uploading original file:', error);
    return original;
  }
}

/**
 * Formats a byte count for the upload status messages.
 * @param bytes - Size in bytes
 * @returns e.g. "12,3 MB" or "850 KB"
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
