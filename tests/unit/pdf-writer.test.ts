/**
 * @jest-environment node
 */
import * as zlib from 'zlib';
import { pdfDeImagens, pdfSomenteTexto, quebrarLinhas } from '@/lib/pdf-tools/pdf-writer';
import { codificarWinAnsi, larguraTexto } from '@/lib/pdf-tools/winansi';

const deflate = async (dados: Uint8Array) => new Uint8Array(zlib.deflateSync(dados));
const texto = (bytes: Uint8Array) => Buffer.from(bytes).toString('latin1');

/** Every xref entry must point at the "N 0 obj" it names. */
function conferirXref(pdf: string): number {
  const inicio = Number(/startxref\n(\d+)\n%%EOF\n$/.exec(pdf)?.[1]);
  const tabela = pdf.slice(inicio).split('\n');
  const total = Number(tabela[1].split(' ')[1]);
  for (let obj = 1; obj < total; obj++) {
    const offset = Number(tabela[2 + obj].slice(0, 10));
    expect(pdf.slice(offset, offset + `${obj} 0 obj`.length)).toBe(`${obj} 0 obj`);
    expect(tabela[2 + obj]).toHaveLength(19); // 20 bytes with the "\n"
  }
  return total;
}

describe('winansi', () => {
  it('encodes Portuguese text one byte per character', () => {
    expect([...codificarWinAnsi('Infração – “§ 1º”')]).toEqual([
      0x49, 0x6e, 0x66, 0x72, 0x61, 0xe7, 0xe3, 0x6f, 0x20, 0x96, 0x20, 0x93, 0xa7, 0x20, 0x31, 0xba, 0x94,
    ]);
    expect([...codificarWinAnsi('ẽ✓')]).toEqual([0x65, 0x3f]);
  });

  it('measures with the real Helvetica metrics', () => {
    expect(larguraTexto('A', 'Helvetica', 1000)).toBe(667);
    expect(larguraTexto('A', 'Helvetica-Bold', 1000)).toBe(722);
  });
});

describe('quebrarLinhas', () => {
  it('never goes past the width and keeps every word', () => {
    const frase = 'Dirigir sob a influência de álcool ou de qualquer outra substância psicoativa que determine dependência';
    const linhas = quebrarLinhas(frase, 'Helvetica', 10, 150);
    expect(linhas.length).toBeGreaterThan(1);
    for (const linha of linhas) expect(larguraTexto(linha, 'Helvetica', 10)).toBeLessThanOrEqual(150);
    expect(linhas.join(' ')).toBe(frase);
  });

  it('cuts a word longer than the line', () => {
    const linhas = quebrarLinhas('x'.repeat(200), 'Helvetica', 10, 100);
    expect(linhas.join('')).toBe('x'.repeat(200));
    for (const linha of linhas) expect(larguraTexto(linha, 'Helvetica', 10)).toBeLessThanOrEqual(100);
  });
});

describe('pdfSomenteTexto', () => {
  const documento = {
    titulo: 'POP 1.01 — Abordagem',
    paginas: [
      [{ texto: '1. FINALIDADE', titulo: true }, { texto: 'Padronizar a abordagem (segurança).' }],
      Array.from({ length: 120 }, (_v, i) => ({ texto: `Passo ${i + 1}: verificar a situação e registrar a ocorrência.` })),
    ],
  };

  it('writes a structurally valid, compressed PDF', async () => {
    const pdf = texto(await pdfSomenteTexto(documento, deflate));
    expect(pdf.startsWith('%PDF-1.4\n')).toBe(true);
    expect(pdf).toContain('/Filter /FlateDecode');
    expect(pdf).toContain('/BaseFont /Helvetica ');
    expect(pdf).not.toContain('/FontFile'); // nothing embedded
    const paginas = Number(/\/Count (\d+)/.exec(pdf)?.[1]);
    expect(paginas).toBeGreaterThan(1); // 120 steps overflow one A4 page
    expect(conferirXref(pdf)).toBeGreaterThan(5);
  });

  it('writes the original page markers and escapes parentheses and accents', async () => {
    const pdf = texto(await pdfSomenteTexto(documento));
    expect(pdf).toContain('(--- P\\341gina 1 ---) Tj');
    expect(pdf).toContain('(--- P\\341gina 2 ---) Tj');
    expect(pdf).toContain('(Padronizar a abordagem \\(seguran\\347a\\).) Tj');
  });
});

describe('pdfDeImagens', () => {
  it('embeds the JPEG as-is and adds an invisible, width-matched text layer', async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 0xff, 0xd9]);
    const pdf = texto(
      await pdfDeImagens(
        'Escaneado',
        [
          {
            largura: 595,
            altura: 842,
            jpeg,
            larguraPx: 100,
            alturaPx: 141,
            textos: [{ texto: 'Art. 165', x: 72, y: 700, tamanho: 12, largura: 80 }],
          },
        ],
        deflate
      )
    );
    expect(pdf).toContain('/Subtype /Image /Width 100 /Height 141');
    expect(pdf).toContain('/Filter /DCTDecode /Length 9');
    expect(pdf).toContain(Buffer.from(jpeg).toString('latin1'));
    conferirXref(pdf);

    const conteudo = /\/Length \d+ >>\nstream\n([\s\S]*?)\nendstream/g;
    const streams = [...pdf.matchAll(conteudo)].map((m) => m[1]);
    const camada = zlib.inflateSync(Buffer.from(streams[1], 'latin1')).toString('latin1');
    expect(camada).toContain('3 Tr');
    const escala = Number(/([\d.]+) Tz/.exec(camada)?.[1]);
    expect(escala).toBeCloseTo((80 / larguraTexto('Art. 165', 'Helvetica', 12)) * 100, 1);
  });
});
