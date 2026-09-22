/**
 * @jest-environment node
 */
import * as zlib from 'zlib';
import { compressFile, formatBytes } from '@/lib/ingestion/compress-client';
import { isGzip, maybeGunzip, MAX_DECOMPRESSED_BYTES } from '@/lib/ingestion/decompress';

describe('compressFile (browser side)', () => {
  it('gzips a compressible file, keeping its content type', async () => {
    const text = 'Art. 165. Dirigir sob a influência de álcool. '.repeat(2000);
    const file = new File([text], 'ctb.txt', { type: 'text/plain' });

    const result = await compressFile(file);

    expect(result.compressed).toBe(true);
    expect(result.finalBytes).toBeLessThan(result.originalBytes / 5);
    expect(result.blob.type).toBe('text/plain');

    const bytes = Buffer.from(await result.blob.arrayBuffer());
    expect(isGzip(bytes)).toBe(true);
    expect(maybeGunzip(bytes).toString('utf-8')).toBe(text);
  });

  it('sends the original when gzip barely helps (already-compressed data)', async () => {
    const random = new Uint8Array(64 * 1024);
    for (let i = 0; i < random.length; i++) random[i] = Math.floor(Math.random() * 256);
    const file = new File([random], 'scan.pdf', { type: 'application/pdf' });

    const result = await compressFile(file);

    expect(result.compressed).toBe(false);
    expect(result.blob).toBe(file);
  });
});

describe('maybeGunzip (server side)', () => {
  it('passes non-gzip bytes through untouched', () => {
    const pdf = Buffer.from('%PDF-1.7\n...');
    expect(isGzip(pdf)).toBe(false);
    expect(maybeGunzip(pdf)).toBe(pdf);
  });

  it('rejects a gzip bomb past the decompressed size cap', () => {
    const bomb = zlib.gzipSync(Buffer.alloc(MAX_DECOMPRESSED_BYTES + 1024));
    expect(() => maybeGunzip(bomb)).toThrow(/descomprimido passa de 100 MB/);
  });

  it('reports a corrupt gzip stream', () => {
    const corrupt = Buffer.concat([zlib.gzipSync(Buffer.from('abc')).subarray(0, 10), Buffer.from('xx')]);
    expect(() => maybeGunzip(corrupt)).toThrow(/corrompido/);
  });
});

describe('formatBytes', () => {
  it('formats KB and MB in pt-BR', () => {
    expect(formatBytes(850 * 1024)).toBe('850 KB');
    expect(formatBytes(12.34 * 1024 * 1024)).toBe('12,3 MB');
  });
});
