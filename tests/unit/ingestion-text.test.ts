/**
 * @jest-environment node
 */
import { joinPdfPages, removeRunningHeaders, stripPageMarkers } from '@/lib/ingestion/pdf-text';
import {
  convertReadablePageMarkers,
  decodeTextBytes,
  markdownToText,
  readablePageMarker,
} from '@/lib/ingestion/plain-text';
import { extensaoDe, formatoDoArquivo, mimeParaEnvio } from '@/lib/ingestion/formats';

describe('removeRunningHeaders', () => {
  const secoes = ['alfa', 'beta', 'gama', 'delta'];
  const corpo = (n: number) =>
    Array.from({ length: 8 }, (_v, i) => `Orientação ${secoes[n - 1]} número ${i + 1} para a guarnição.`).join('\n');
  const pagina = (n: number) =>
    [
      'POLÍCIA MILITAR DE SANTA CATARINA',
      `POP 1.01 - Abordagem - Pág. ${n}/4`,
      corpo(n),
      'Infração - gravíssima;',
      `Página ${n} de 4`,
    ].join('\n');

  it('drops headers, footers and page counters repeated on most pages', () => {
    const pages = removeRunningHeaders([1, 2, 3, 4].map(pagina));
    pages.forEach((page, i) => expect(page).toBe(`${corpo(i + 1)}\nInfração - gravíssima;`));
  });

  it('never drops a structural line of a law, however often it repeats', () => {
    const pages = removeRunningHeaders([1, 2, 3, 4].map(pagina));
    expect(pages.every((page) => page.includes('Infração - gravíssima;'))).toBe(true);
  });

  it('leaves short documents alone', () => {
    const pages = [pagina(1), pagina(2)];
    expect(removeRunningHeaders(pages)).toEqual(pages);
  });

  it('joins pages with markers the chunker understands', () => {
    const texto = joinPdfPages(['Art. 1º Primeira página.', 'Continua na segunda.', 'Terceira.']);
    expect(texto.split('\n')[0]).toBe('[[pagina:1]]');
    expect(texto).toContain('[[pagina:3]]\nTerceira.');
    expect(stripPageMarkers(texto)).toBe('Art. 1º Primeira página.\n\nContinua na segunda.\n\nTerceira.');
  });
});

describe('decodeTextBytes', () => {
  it('reads UTF-8 and drops the BOM', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...Buffer.from('Habilitação', 'utf-8')]);
    expect(decodeTextBytes(bytes)).toBe('Habilitação');
  });

  it('falls back to Windows-1252 instead of turning accents into "�"', () => {
    const bytes = new Uint8Array(Buffer.from('Infração gravíssima', 'latin1'));
    expect(decodeTextBytes(bytes)).toBe('Infração gravíssima');
  });

  it('reads UTF-16 files saved by Notepad', () => {
    const bytes = new Uint8Array([0xff, 0xfe, ...Buffer.from('Veículo', 'utf16le')]);
    expect(decodeTextBytes(bytes)).toBe('Veículo');
  });
});

describe('markdownToText', () => {
  it('keeps headings and lists, drops links, emphasis and table rulers', () => {
    const md = [
      '# POP 2.03',
      '',
      'Fiscalização **com** etilômetro, conforme o [art. 165](https://planalto.gov.br).',
      '',
      '* Sinalizar o bloqueio',
      '1. Abordar o *condutor*',
      '',
      '| Resultado | Providência |',
      '|---|---|',
      '| até 0,04 mg/L | liberar |',
    ].join('\n');
    expect(markdownToText(md)).toBe(
      [
        '# POP 2.03',
        '',
        'Fiscalização com etilômetro, conforme o art. 165.',
        '',
        '- Sinalizar o bloqueio',
        '1. Abordar o condutor',
        '',
        'Resultado | Providência',
        '',
        'até 0,04 mg/L | liberar',
      ].join('\n')
    );
  });
});

describe('page markers in plain text', () => {
  it('turns the compressor\'s "--- Página N ---" lines into chunker markers', () => {
    const texto = `${readablePageMarker(1)}\nAbertura\n\n${readablePageMarker(2)}\nFim`;
    expect(convertReadablePageMarkers(texto)).toBe('[[pagina:1]]\nAbertura\n\n[[pagina:2]]\nFim');
  });
});

describe('formats', () => {
  it('recognizes every accepted extension', () => {
    expect(['a.pdf', 'b.DOCX', 'c.doc', 'd.md', 'e.markdown', 'f.txt'].map(formatoDoArquivo)).toEqual([
      'pdf',
      'docx',
      'doc',
      'md',
      'md',
      'txt',
    ]);
    expect(formatoDoArquivo('virus.exe')).toBeNull();
    expect(extensaoDe('sem-extensao')).toBe('');
  });

  it('uploads Markdown as text/plain so the bucket accepts it before migration 008', () => {
    expect(mimeParaEnvio('pop.md')).toBe('text/plain');
    expect(mimeParaEnvio('pop.doc')).toBe('application/msword');
  });
});
