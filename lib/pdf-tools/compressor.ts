// PDF compressor that runs entirely in the browser: the file never leaves
// the device, and a PDF too big to send anywhere can be shrunk first.
//   leve / forte — pages re-rendered as JPEG (same look), with the original
//                  text kept underneath as an invisible layer (searchable);
//   texto        — maximum compression: text only, no design, and a .txt.
// Import this module dynamically: it pulls pdf.js (hundreds of KB) and uses
// browser APIs (canvas, Worker, CompressionStream).
import { pageItemsToText, pdfTextForUpload, type PdfTextItem } from '@/lib/ingestion/pdf-text';
import { pdfDeImagens, pdfSomenteTexto, type Deflate, type PaginaImagem, type TextoPosicionado } from './pdf-writer';
import { paginasParaDocumento, paginasParaTxt, temTexto } from './texto';

export type NivelCompressao = 'leve' | 'forte' | 'texto';

export const NIVEIS: Record<NivelCompressao, { dpi: number; qualidade: number }> = {
  leve: { dpi: 120, qualidade: 0.75 },
  forte: { dpi: 85, qualidade: 0.5 },
  texto: { dpi: 0, qualidade: 0 },
};

// Canvas pages above this many pixels per side are rendered at a lower scale.
const MAX_LADO_PX = 2600;

type Pdfjs = typeof import('pdfjs-dist/legacy/build/pdf.mjs');
type PdfDoc = Awaited<ReturnType<Pdfjs['getDocument']>['promise']>;

let pdfjsPromise: Promise<Pdfjs> | null = null;

/**
 * pdf.js with its worker as a separate bundled asset. The legacy build runs
 * on the older phone browsers the modern build rejects.
 */
function carregarPdfjs(): Promise<Pdfjs> {
  pdfjsPromise ??= import('pdfjs-dist/legacy/build/pdf.mjs').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.min.mjs', import.meta.url).toString();
    return pdfjs;
  });
  return pdfjsPromise;
}

/** zlib compression for the PDF streams, when the browser has it. */
export const deflateNavegador: Deflate | undefined =
  typeof CompressionStream === 'undefined'
    ? undefined
    : async (dados) => {
        const stream = new Blob([dados as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
        return new Uint8Array(await new Response(stream).arrayBuffer());
      };

function semExtensao(nome: string): string {
  return nome.replace(/\.[^.]+$/, '') || 'documento';
}

async function abrir(arquivo: File): Promise<{ pdfjs: Pdfjs; doc: PdfDoc }> {
  const pdfjs = await carregarPdfjs();
  try {
    const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()), isEvalSupported: false }).promise;
    return { pdfjs, doc };
  } catch (error) {
    const nome = error instanceof Error ? error.name : '';
    if (nome === 'PasswordException') throw new Error('O PDF está protegido por senha. Remova a senha e tente de novo.');
    throw new Error('Não foi possível abrir o arquivo: ele não é um PDF válido ou está corrompido.');
  }
}

/**
 * Text of each page, rebuilt the same way the server indexes PDFs.
 */
export async function extrairPaginas(arquivo: File, onProgresso?: (feito: number, total: number) => void): Promise<string[]> {
  const { doc } = await abrir(arquivo);
  try {
    const paginas: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const pagina = await doc.getPage(i);
      const conteudo = await pagina.getTextContent();
      paginas.push(pageItemsToText(conteudo.items as PdfTextItem[]));
      pagina.cleanup();
      onProgresso?.(i, doc.numPages);
    }
    return paginas;
  } finally {
    await doc.destroy();
  }
}

/**
 * A PDF turned into a .txt ready to index: "compressão máxima" for upload.
 * @throws When the PDF has no selectable text (scanned)
 */
export async function pdfParaTexto(arquivo: File, onProgresso?: (feito: number, total: number) => void): Promise<File> {
  const paginas = await extrairPaginas(arquivo, onProgresso);
  if (!temTexto(paginas)) {
    throw new Error('Este PDF não tem texto selecionável (parece digitalizado). Envie o PDF original ou passe um OCR antes.');
  }
  const titulo = semExtensao(arquivo.name);
  return new File([pdfTextForUpload(paginas)], `${titulo}.txt`, { type: 'text/plain' });
}

function canvasParaJpeg(canvas: HTMLCanvasElement, qualidade: number): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject) : reject(new Error('Falha ao gerar a imagem da página.'))),
      'image/jpeg',
      qualidade
    );
  });
}

async function paginaComoImagem(pdfjs: Pdfjs, doc: PdfDoc, numero: number, nivel: 'leve' | 'forte'): Promise<PaginaImagem> {
  const pagina = await doc.getPage(numero);
  try {
    const pontos = pagina.getViewport({ scale: 1 });
    const escala = Math.min(NIVEIS[nivel].dpi / 72, MAX_LADO_PX / Math.max(pontos.width, pontos.height));
    const viewport = pagina.getViewport({ scale: escala });

    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('O navegador não conseguiu desenhar a página.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: ctx, viewport }).promise;
    const jpeg = await canvasParaJpeg(canvas, NIVEIS[nivel].qualidade);
    const larguraPx = canvas.width;
    const alturaPx = canvas.height;
    canvas.width = 0; // frees the bitmap right away on mobile
    canvas.height = 0;

    // Original text, placed where it was, so the result stays searchable.
    const conteudo = await pagina.getTextContent();
    const textos: TextoPosicionado[] = [];
    for (const item of conteudo.items as PdfTextItem[]) {
      if (typeof item.str !== 'string' || !item.str.trim()) continue;
      const m = pdfjs.Util.transform(pontos.transform, item.transform);
      textos.push({
        texto: item.str,
        x: m[4],
        y: pontos.height - m[5],
        tamanho: Math.hypot(m[2], m[3]),
        largura: item.width,
      });
    }

    return { largura: pontos.width, altura: pontos.height, jpeg, larguraPx, alturaPx, textos };
  } finally {
    pagina.cleanup();
  }
}

export interface ResultadoCompressao {
  arquivo: Blob;
  nomeArquivo: string;
  bytesOriginais: number;
  bytesFinais: number;
  paginas: number;
  /** The compressed version would be bigger: the original is returned. */
  semGanho: boolean;
  /** Text-only level: the same content as .txt. */
  txt?: { arquivo: Blob; nomeArquivo: string };
}

/**
 * @param arquivo - PDF chosen by the user
 * @param nivel - 'leve' / 'forte' keep the look; 'texto' keeps only the text
 * @param onProgresso - Called after each page
 */
export async function comprimirPdf(
  arquivo: File,
  nivel: NivelCompressao,
  onProgresso?: (feito: number, total: number) => void
): Promise<ResultadoCompressao> {
  const titulo = semExtensao(arquivo.name);

  if (nivel === 'texto') {
    const paginas = await extrairPaginas(arquivo, onProgresso);
    if (!temTexto(paginas)) {
      throw new Error(
        'Este PDF não tem texto selecionável (parece digitalizado): a compressão máxima guarda só o texto e ficaria vazia. Use a compressão Leve ou Forte.'
      );
    }
    const pdf = await pdfSomenteTexto(paginasParaDocumento(titulo, paginas), deflateNavegador);
    return {
      arquivo: new Blob([pdf as BlobPart], { type: 'application/pdf' }),
      nomeArquivo: `${titulo} (somente texto).pdf`,
      bytesOriginais: arquivo.size,
      bytesFinais: pdf.length,
      paginas: paginas.length,
      semGanho: false,
      txt: { arquivo: new Blob([paginasParaTxt(titulo, paginas)], { type: 'text/plain' }), nomeArquivo: `${titulo}.txt` },
    };
  }

  const { pdfjs, doc } = await abrir(arquivo);
  try {
    const paginas: PaginaImagem[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      paginas.push(await paginaComoImagem(pdfjs, doc, i, nivel));
      onProgresso?.(i, doc.numPages);
    }
    const pdf = await pdfDeImagens(titulo, paginas, deflateNavegador);
    const semGanho = pdf.length >= arquivo.size;
    return {
      arquivo: semGanho ? arquivo : new Blob([pdf as BlobPart], { type: 'application/pdf' }),
      nomeArquivo: semGanho ? arquivo.name : `${titulo} (comprimido).pdf`,
      bytesOriginais: arquivo.size,
      bytesFinais: semGanho ? arquivo.size : pdf.length,
      paginas: doc.numPages,
      semGanho,
    };
  } finally {
    await doc.destroy();
  }
}
