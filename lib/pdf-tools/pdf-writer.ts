// Minimal PDF 1.4 writer — dependency-free and isomorphic (browser + Node).
// It produces the two outputs of the PDF compressor:
//  - text only (Helvetica, never embedded): the "maximum" level, a small
//    fraction of the original size and trivially indexable;
//  - page images (JPEG) under an invisible text layer: same look, smaller,
//    and still searchable/indexable.
import { codificarWinAnsi, larguraTexto, type Fonte } from './winansi';

/** zlib (RFC 1950) compressor: CompressionStream('deflate') in the browser, zlib.deflateSync in Node. */
export type Deflate = (dados: Uint8Array) => Promise<Uint8Array>;

export const A4 = { largura: 595.28, altura: 841.89 };
const MARGEM = { lado: 56, topo: 60, base: 56 };

const encoder = new TextEncoder();

function latin1(texto: string): Uint8Array {
  return Uint8Array.from(texto, (c) => c.charCodeAt(0) & 0xff);
}

/** PDF literal string with WinAnsi bytes; non-ASCII as octal escapes. */
function literal(texto: string): string {
  let out = '(';
  for (const byte of codificarWinAnsi(texto)) {
    if (byte === 0x28 || byte === 0x29 || byte === 0x5c) out += `\\${String.fromCharCode(byte)}`;
    else if (byte < 0x20 || byte > 0x7e) out += `\\${byte.toString(8).padStart(3, '0')}`;
    else out += String.fromCharCode(byte);
  }
  return `${out})`;
}

/** Text string in UTF-16BE (for metadata such as the title). */
function textoUnicode(texto: string): string {
  let hex = 'FEFF';
  for (const unidade of texto) {
    const code = unidade.codePointAt(0)!;
    if (code > 0xffff) continue;
    hex += code.toString(16).padStart(4, '0').toUpperCase();
  }
  return `<${hex}>`;
}

const num = (valor: number) => (Math.round(valor * 100) / 100).toString();

class Construtor {
  private partes: Uint8Array[] = [];
  private tamanho = 0;
  private offsets: number[] = [];
  private proximo = 1;

  constructor(private deflate?: Deflate) {
    // Binary comment right after the header marks the file as binary.
    this.escrever(latin1('%PDF-1.4\n%âãÏÓ\n'));
  }

  reservar(): number {
    return this.proximo++;
  }

  private escrever(bytes: Uint8Array): void {
    this.partes.push(bytes);
    this.tamanho += bytes.length;
  }

  objeto(numero: number, conteudo: string): void {
    this.offsets[numero] = this.tamanho;
    this.escrever(latin1(`${numero} 0 obj\n${conteudo}\nendobj\n`));
  }

  async stream(numero: number, dicionario: string, dados: Uint8Array, comprimir = true): Promise<void> {
    let corpo = dados;
    let filtro = '';
    if (comprimir && this.deflate) {
      corpo = await this.deflate(dados);
      filtro = ' /Filter /FlateDecode';
    }
    this.offsets[numero] = this.tamanho;
    this.escrever(latin1(`${numero} 0 obj\n<< ${dicionario}${filtro} /Length ${corpo.length} >>\nstream\n`));
    this.escrever(corpo);
    this.escrever(latin1('\nendstream\nendobj\n'));
  }

  finalizar(raiz: number, info: number): Uint8Array {
    const inicioXref = this.tamanho;
    let xref = `xref\n0 ${this.proximo}\n0000000000 65535 f \n`;
    for (let i = 1; i < this.proximo; i++) {
      xref += `${String(this.offsets[i] ?? 0).padStart(10, '0')} 00000 n \n`;
    }
    xref += `trailer\n<< /Size ${this.proximo} /Root ${raiz} 0 R /Info ${info} 0 R >>\nstartxref\n${inicioXref}\n%%EOF\n`;
    this.escrever(latin1(xref));

    const saida = new Uint8Array(this.tamanho);
    let pos = 0;
    for (const parte of this.partes) {
      saida.set(parte, pos);
      pos += parte.length;
    }
    return saida;
  }
}

interface Linha {
  texto: string;
  fonte: Fonte;
  tamanho: number;
  cinza?: boolean;
  /** Extra space before the line, in points. */
  antes: number;
}

/**
 * Greedy word wrap by real glyph widths; a word wider than the line is cut.
 */
export function quebrarLinhas(texto: string, fonte: Fonte, tamanho: number, largura: number): string[] {
  const linhas: string[] = [];
  let atual = '';
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (larguraTexto(tentativa, fonte, tamanho) <= largura) {
      atual = tentativa;
      continue;
    }
    if (atual) linhas.push(atual);
    atual = palavra;
    while (larguraTexto(atual, fonte, tamanho) > largura && atual.length > 1) {
      let corte = atual.length - 1;
      while (corte > 1 && larguraTexto(atual.slice(0, corte), fonte, tamanho) > largura) corte--;
      linhas.push(atual.slice(0, corte));
      atual = atual.slice(corte);
    }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export interface BlocoTexto {
  texto: string;
  titulo?: boolean;
}

export interface DocumentoTexto {
  titulo: string;
  /** Blocks (paragraphs/headings) of each original page. */
  paginas: BlocoTexto[][];
}

/**
 * Text-only PDF: no images, no fonts embedded, no layout — the smallest
 * faithful version of a document. Each original page starts with a
 * "--- Página N ---" line, which the indexer reads back as that page number.
 */
export async function pdfSomenteTexto(documento: DocumentoTexto, deflate?: Deflate): Promise<Uint8Array> {
  const largura = A4.largura - 2 * MARGEM.lado;
  const linhas: Linha[] = [
    ...quebrarLinhas(documento.titulo, 'Helvetica-Bold', 14, largura).map((texto, i) => ({
      texto,
      fonte: 'Helvetica-Bold' as Fonte,
      tamanho: 14,
      antes: i === 0 ? 0 : 4,
    })),
    {
      texto: `Versão somente texto (sem imagens nem formatação) · ${documento.paginas.length} página(s) no original`,
      fonte: 'Helvetica',
      tamanho: 8,
      cinza: true,
      antes: 6,
    },
  ];

  documento.paginas.forEach((blocos, i) => {
    linhas.push({ texto: `--- Página ${i + 1} ---`, fonte: 'Helvetica-Bold', tamanho: 8, cinza: true, antes: 16 });
    for (const bloco of blocos) {
      const fonte: Fonte = bloco.titulo ? 'Helvetica-Bold' : 'Helvetica';
      const tamanho = bloco.titulo ? 10.5 : 10;
      quebrarLinhas(bloco.texto, fonte, tamanho, largura).forEach((texto, j) =>
        linhas.push({ texto, fonte, tamanho, antes: j === 0 ? (bloco.titulo ? 9 : 5) : 0 })
      );
    }
  });

  // Paginate: each output page is one content stream.
  const paginas: string[] = [];
  let conteudo = '';
  let y = A4.altura - MARGEM.topo;
  for (const linha of linhas) {
    const altura = linha.tamanho * 1.35 + linha.antes;
    if (y - altura < MARGEM.base && conteudo) {
      paginas.push(conteudo);
      conteudo = '';
      y = A4.altura - MARGEM.topo;
    }
    y -= conteudo ? altura : linha.tamanho * 1.35;
    const fonte = linha.fonte === 'Helvetica' ? '/F1' : '/F2';
    conteudo += `${linha.cinza ? '0.45' : '0'} g ${fonte} ${num(linha.tamanho)} Tf 1 0 0 1 ${num(MARGEM.lado)} ${num(y)} Tm ${literal(linha.texto)} Tj\n`;
  }
  if (conteudo) paginas.push(conteudo);

  return montar(
    documento.titulo,
    paginas.map((c) => ({ largura: A4.largura, altura: A4.altura, conteudo: `BT\n${c}ET\n` })),
    deflate
  );
}

export interface TextoPosicionado {
  texto: string;
  /** Baseline origin in PDF points (origin at the bottom-left). */
  x: number;
  y: number;
  tamanho: number;
  /** Width the text occupied in the original page, in points. */
  largura: number;
}

export interface PaginaImagem {
  /** Page size in points. */
  largura: number;
  altura: number;
  jpeg: Uint8Array;
  larguraPx: number;
  alturaPx: number;
  textos: TextoPosicionado[];
}

/**
 * Invisible text (render mode 3) stretched to the width each piece had in
 * the original, so selection, search and indexing keep working.
 */
function camadaDeTexto(textos: TextoPosicionado[]): string {
  if (textos.length === 0) return '';
  let out = 'BT\n3 Tr\n';
  for (const t of textos) {
    const texto = t.texto.replace(/\s+/g, ' ');
    if (!texto.trim() || t.tamanho <= 0) continue;
    const natural = larguraTexto(texto, 'Helvetica', t.tamanho);
    const escala = natural > 0 && t.largura > 0 ? Math.min(500, Math.max(10, (t.largura / natural) * 100)) : 100;
    out += `/F1 ${num(t.tamanho)} Tf ${num(escala)} Tz 1 0 0 1 ${num(t.x)} ${num(t.y)} Tm ${literal(texto)} Tj\n`;
  }
  return `${out}ET\n`;
}

/**
 * PDF made of page images (JPEG) with the original text kept underneath.
 */
export async function pdfDeImagens(titulo: string, paginas: PaginaImagem[], deflate?: Deflate): Promise<Uint8Array> {
  return montar(
    titulo,
    paginas.map((p) => ({
      largura: p.largura,
      altura: p.altura,
      conteudo: `q ${num(p.largura)} 0 0 ${num(p.altura)} 0 0 cm /Im0 Do Q\n${camadaDeTexto(p.textos)}`,
      imagem: p,
    })),
    deflate
  );
}

interface PaginaMontagem {
  largura: number;
  altura: number;
  conteudo: string;
  imagem?: PaginaImagem;
}

async function montar(titulo: string, paginas: PaginaMontagem[], deflate?: Deflate): Promise<Uint8Array> {
  const pdf = new Construtor(deflate);
  const catalogo = pdf.reservar();
  const arvore = pdf.reservar();
  const f1 = pdf.reservar();
  const f2 = pdf.reservar();
  const info = pdf.reservar();

  const kids: number[] = [];
  for (const pagina of paginas) {
    const pag = pdf.reservar();
    const conteudo = pdf.reservar();
    const imagem = pagina.imagem ? pdf.reservar() : null;
    kids.push(pag);

    if (imagem !== null && pagina.imagem) {
      await pdf.stream(
        imagem,
        `/Type /XObject /Subtype /Image /Width ${pagina.imagem.larguraPx} /Height ${pagina.imagem.alturaPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode`,
        pagina.imagem.jpeg,
        false
      );
    }
    await pdf.stream(conteudo, '', encoder.encode(pagina.conteudo));
    const recursos = `/Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${imagem !== null ? ` /XObject << /Im0 ${imagem} 0 R >>` : ''}`;
    pdf.objeto(
      pag,
      `<< /Type /Page /Parent ${arvore} 0 R /MediaBox [0 0 ${num(pagina.largura)} ${num(pagina.altura)}] /Resources << ${recursos} >> /Contents ${conteudo} 0 R >>`
    );
  }

  pdf.objeto(f1, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  pdf.objeto(f2, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  pdf.objeto(arvore, `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`);
  pdf.objeto(catalogo, `<< /Type /Catalog /Pages ${arvore} 0 R >>`);
  pdf.objeto(info, `<< /Title ${textoUnicode(titulo)} /Producer (CTB Agente) /Creator (CTB Agente - compressor de PDF) >>`);

  return pdf.finalizar(catalogo, info);
}
