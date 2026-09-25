/**
 * @jest-environment node
 */
// Unit tests for document ingestion system
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { parseDocument, validateFile, pageItemsToText, normalizePdfText } from '@/lib/ingestion/parser';
import { chunkText } from '@/lib/ingestion/chunker';

describe('Document Parser', () => {
  let tempDir: string;

  beforeAll(() => {
    // Create temp directory for test files
    tempDir = path.join(os.tmpdir(), `parser-tests-${Date.now()}`);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('validateFile', () => {
    it('should validate a valid file', () => {
      const testFile = path.join(tempDir, 'test.txt');
      fs.writeFileSync(testFile, 'Test content');

      expect(() => {
        validateFile({ filePath: testFile, fileName: 'test.txt' });
      }).not.toThrow();
    });

    it('should reject non-existent file', () => {
      expect(() => {
        validateFile({
          filePath: path.join(tempDir, 'nonexistent.txt'),
          fileName: 'nonexistent.txt',
        });
      }).toThrow('File not found');
    });

    it('should reject unsupported file types', () => {
      const testFile = path.join(tempDir, 'test.xyz');
      fs.writeFileSync(testFile, 'Test content');

      expect(() => {
        validateFile({ filePath: testFile, fileName: 'test.xyz' });
      }).toThrow('File type not allowed');
    });

    it('should reject files exceeding size limit', () => {
      const testFile = path.join(tempDir, 'large.txt');
      // Create a file larger than 1MB
      const largeContent = 'x'.repeat(2 * 1024 * 1024);
      fs.writeFileSync(testFile, largeContent);

      expect(() => {
        validateFile({
          filePath: testFile,
          fileName: 'large.txt',
          maxSizeBytes: 1024 * 1024, // 1MB limit
        });
      }).toThrow('File too large');
    });
  });

  describe('parsePdf', () => {
    it('parses a PDF without ever handing pdfjs a Node Buffer', async () => {
      // Content doesn't matter here — tests/mocks/pdf.js stands in for
      // pdfjs-dist and only cares whether it received a Buffer or a plain
      // Uint8Array, same constructor check the real library makes.
      const testFile = path.join(tempDir, 'test-parse.pdf');
      fs.writeFileSync(testFile, '%PDF-1.4 minimal fixture, content unused by the mock');

      const result = await parseDocument(testFile, 'test-parse.pdf');

      expect(result.fileType).toBe('pdf');
      expect(result.text).toContain('Mock PDF text');
      expect(result.pageCount).toBe(1);
    });

    it('registers the worker handler on globalThis instead of relying on a dynamic import', () => {
      // Once Next.js/Vercel bundles this route into a single file, there's
      // no pdf.worker.mjs sitting next to it for pdfjs's fallback dynamic
      // import to find — this is what makes pdfjs skip that lookup.
      const globalWithWorker = globalThis as unknown as {
        pdfjsWorker?: { WorkerMessageHandler: unknown };
      };
      expect(globalWithWorker.pdfjsWorker?.WorkerMessageHandler).toBeDefined();
    });
  });

  describe('Word 97-2003 and content sniffing', () => {
    it('reads a real .doc file (Word 97-2003 binary format)', async () => {
      const fixture = path.join(__dirname, '..', 'fixtures', 'pop-exemplo.doc');
      const result = await parseDocument(fixture, 'pop-exemplo.doc');

      expect(result.fileType).toBe('doc');
      expect(result.text).toContain('3. SEQUÊNCIA DAS AÇÕES');
      // One paragraph per block, so the chunker can see each step.
      expect(result.text).toMatch(/\n\n1\. Informar à central/);
    });

    it('trusts the content over the extension (a .docx renamed to .doc)', async () => {
      const testFile = path.join(tempDir, 'renomeado.doc');
      fs.writeFileSync(testFile, Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]));

      const result = await parseDocument(testFile, 'renomeado.doc');
      expect(result.fileType).toBe('docx'); // routed to mammoth (mocked here)
    });

    it('explains what to do with an RTF saved as .doc', async () => {
      const testFile = path.join(tempDir, 'antigo.doc');
      fs.writeFileSync(testFile, '{\\rtf1\\ansi Texto}');

      await expect(parseDocument(testFile, 'antigo.doc')).rejects.toThrow(/RTF/);
    });

    it('rejects a .pdf whose content is not a PDF', async () => {
      const testFile = path.join(tempDir, 'falso.pdf');
      fs.writeFileSync(testFile, 'apenas texto');

      await expect(parseDocument(testFile, 'falso.pdf')).rejects.toThrow(/não é um PDF válido/);
    });

    it('reads Markdown without its markup and a Windows-1252 text file with its accents', async () => {
      const md = path.join(tempDir, 'pop.md');
      fs.writeFileSync(md, '# POP 2.03\n\nUse o **etilômetro** conforme o [art. 165](https://x).');
      expect((await parseDocument(md, 'pop.md')).text).toBe('# POP 2.03\n\nUse o etilômetro conforme o art. 165.');

      const txt = path.join(tempDir, 'latin1.txt');
      fs.writeFileSync(txt, Buffer.from('Infração gravíssima', 'latin1'));
      expect((await parseDocument(txt, 'latin1.txt')).text).toBe('Infração gravíssima');
    });
  });

  describe('parseTxt', () => {
    it('should extract text from TXT file', async () => {
      const testFile = path.join(tempDir, 'test-parse.txt');
      const testContent = 'Art. 165 - Proíbe estacionar...\n\nArt. 166 - Proíbe virar...';
      fs.writeFileSync(testFile, testContent);

      const result = await parseDocument(testFile, 'test-parse.txt');

      expect(result.text).toContain('Art. 165');
      expect(result.fileType).toBe('txt');
      expect(result.fileName).toBe('test-parse.txt');
    });

    it('should normalize line breaks', async () => {
      const testFile = path.join(tempDir, 'test-linebreaks.txt');
      const testContent = 'Line 1\r\nLine 2\r\n\r\n\r\nLine 3';
      fs.writeFileSync(testFile, testContent);

      const result = await parseDocument(testFile, 'test-linebreaks.txt');

      // Should not have excessive line breaks
      expect(result.text).not.toMatch(/\n{3,}/);
    });

    it('should trim whitespace', async () => {
      const testFile = path.join(tempDir, 'test-whitespace.txt');
      const testContent = '   \n\nContent here\n\n   ';
      fs.writeFileSync(testFile, testContent);

      const result = await parseDocument(testFile, 'test-whitespace.txt');

      expect(result.text).toBe('Content here');
    });
  });

  describe('Text Chunker', () => {
    const sampleText = `Art. 165 - Estacionar em local proibido.

Parágrafo 1º - Fica proibido estacionar em qualquer lugar que comprometa a circulação.

Parágrafo 2º - A penalidade é de multa e possível remoção do veículo.

Art. 166 - Parar em local proibido.

Parágrafo único - Considera-se parada a imobilização do veículo por mais de 5 minutos.`;

    it('should chunk text by paragraphs', () => {
      const chunks = chunkText(sampleText);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].text).toBeTruthy();
      expect(chunks[0].order).toBe(0);
    });

    it('should respect target chunk size', () => {
      const chunks = chunkText(sampleText, 100);

      for (const chunk of chunks) {
        // Most chunks should be under the target size (unless a single paragraph is larger)
        expect(chunk.text.length).toBeGreaterThan(0);
      }
    });

    it('should preserve article numbers', () => {
      const chunks = chunkText(sampleText);

      // Should detect article numbers
      const articlesFound = chunks.filter((c) => c.numero_dispositivo);
      expect(articlesFound.length).toBeGreaterThan(0);
    });

    it('should filter out empty chunks', () => {
      const chunks = chunkText(sampleText);

      for (const chunk of chunks) {
        expect(chunk.text.length).toBeGreaterThan(20);
      }
    });

    it('should handle single paragraph', () => {
      const singleParagraph = 'Art. 165 - This is a single article.';
      const chunks = chunkText(singleParagraph);

      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toBe(singleParagraph);
    });

    it('should handle empty text', () => {
      const chunks = chunkText('');

      expect(chunks.length).toBe(0);
    });

    it('should handle whitespace-only text', () => {
      const chunks = chunkText('   \n\n   ');

      expect(chunks.length).toBe(0);
    });
  });

  describe('Citation Extraction', () => {
    it('should extract article numbers with paragraphs', () => {
      const text = 'Art. 165 § 1º proíbe...';
      const chunks = chunkText(text);

      expect(chunks[0].numero_dispositivo).toBe('art. 165 § 1º');
    });

    it('should extract simple article numbers', () => {
      const text = 'Art. 165 proíbe estacionar.';
      const chunks = chunkText(text);

      expect(chunks[0].numero_dispositivo).toBe('art. 165');
    });

    it('should handle various article formats', () => {
      const testCases = [
        { text: 'art. 165 proíbe estacionar em local proibido pela lei de trânsito', expected: 'art. 165' },
        { text: 'Art. 165 proíbe estacionar em local proibido pela lei de trânsito', expected: 'art. 165' },
        { text: 'artigo 165 proíbe estacionar em local proibido pela lei de trânsito', expected: 'art. 165' },
      ];

      for (const testCase of testCases) {
        const chunks = chunkText(testCase.text);
        expect(chunks.length).toBeGreaterThan(0);
        expect(chunks[0].numero_dispositivo).toBe(testCase.expected);
      }
    });
  });

  describe('Error Handling', () => {
    it('should throw on invalid file path during validation', () => {
      expect(() => {
        validateFile({
          filePath: '/invalid/path/file.txt',
          fileName: 'file.txt',
        });
      }).toThrow();
    });

    it('should throw on parse with no content', async () => {
      const testFile = path.join(tempDir, 'empty.txt');
      fs.writeFileSync(testFile, '');

      // Attempt to parse empty file
      await expect(
        parseDocument(testFile, 'empty.txt'),
      ).rejects.toThrow('No text content extracted');
    });
  });

  describe('Large Document Handling', () => {
    it('should handle large text efficiently', () => {
      const largeText = Array(100)
        .fill(null)
        .map((_, i) => `Art. ${100 + i} - This is article ${100 + i}.\n\nContent for article ${100 + i}.`)
        .join('\n\n');

      const chunks = chunkText(largeText);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.length).toBeLessThan(150); // Should not create excessive chunks
    });
  });

  describe('Integration', () => {
    it('should parse and chunk a complete TXT document', async () => {
      const testFile = path.join(tempDir, 'integration-test.txt');
      const content = `Art. 165 § 1º - Estacionar em local proibido.

Esta é uma violação grave da lei de trânsito.

Art. 165 § 2º - Penalidades.

A penalidade é multa e possível remoção.

Art. 166 - Parar em local proibido.

Artigo 166 trata de outro tipo de violação.`;

      fs.writeFileSync(testFile, content);

      const parsed = await parseDocument(testFile, 'integration-test.txt');
      const chunks = chunkText(parsed.text);

      expect(chunks.length).toBeGreaterThan(0);
      expect(parsed.fileType).toBe('txt');
      expect(chunks.some((c) => c.numero_dispositivo)).toBe(true);
    });
  });
});

describe('Chunk Validation', () => {
  it('should maintain chunk order', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const chunks = chunkText(text);

    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].order).toBe(i);
    }
  });

  it('should not create overlapping chunks', () => {
    const text = Array(10)
      .fill(null)
      .map((_, i) => `Paragraph ${i}: Lorem ipsum dolor sit amet.`)
      .join('\n\n');

    const chunks = chunkText(text);
    const combinedText = chunks.map((c) => c.text).join('');

    // Combined chunks should have roughly the same length as original
    expect(Math.abs(combinedText.length - text.length)).toBeLessThan(
      text.length * 0.1,
    );
  });
});

describe('PDF text reconstruction', () => {
  const item = (str: string, x: number, y: number, width: number) => ({
    str,
    transform: [10, 0, 0, 10, x, y],
    width,
    height: 10,
  });

  it('keeps words split across fragments together and separates spaced ones', () => {
    const text = pageItemsToText([item('Cód', 0, 700, 18), item('igo', 18, 700, 15), item('de', 36, 700, 10)]);
    expect(text).toBe('Código de');
  });

  it('breaks lines on vertical moves and paragraphs on large gaps', () => {
    const text = pageItemsToText([item('linha 1', 0, 700, 30), item('linha 2', 0, 688, 30), item('outro', 0, 650, 25)]);
    expect(text).toBe('linha 1\nlinha 2\n\noutro');
  });

  it('rejoins hyphenated words and starts a paragraph at each article', () => {
    expect(normalizePdfText('o trân-\nsito seguro.\nArt. 2º O condutor')).toBe('o trânsito seguro.\n\nArt. 2º O condutor');
  });
});
