// Server-side counterpart of lib/ingestion/compress-client.ts.
import * as zlib from 'zlib';

// Cap on the decompressed size, so a small gzip "bomb" uploaded through the
// admin panel can't expand into gigabytes inside the function.
export const MAX_DECOMPRESSED_BYTES = 100 * 1024 * 1024;

/**
 * True when the bytes are a gzip stream (magic bytes 1f 8b). PDF (%PDF),
 * DOCX (PK zip) and plain text never start this way.
 */
export function isGzip(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/**
 * Returns the original document bytes, gunzipping them if the browser
 * compressed the upload.
 * @param buffer - Bytes downloaded from the documentos-pendentes bucket
 * @throws When the gzip stream is corrupt or expands past MAX_DECOMPRESSED_BYTES
 */
export function maybeGunzip(buffer: Buffer): Buffer {
  if (!isGzip(buffer)) return buffer;

  try {
    return zlib.gunzipSync(buffer, { maxOutputLength: MAX_DECOMPRESSED_BYTES });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ERR_BUFFER_TOO_LARGE') {
      throw new Error(
        `o arquivo descomprimido passa de ${MAX_DECOMPRESSED_BYTES / (1024 * 1024)} MB.`
      );
    }
    throw new Error('o arquivo comprimido está corrompido. Envie novamente.');
  }
}
