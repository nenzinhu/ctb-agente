// Document formats accepted for indexing. Pure module: shared by the upload
// forms (browser), the signed-upload route and the parser (server).

export type FormatoDocumento = 'pdf' | 'docx' | 'doc' | 'md' | 'txt';

interface FormatoInfo {
  extensoes: string[];
  /** Content type sent to Storage; must be in the bucket's allowed_mime_types. */
  mime: string;
  rotulo: string;
}

export const FORMATOS: Record<FormatoDocumento, FormatoInfo> = {
  pdf: { extensoes: ['pdf'], mime: 'application/pdf', rotulo: 'PDF' },
  docx: {
    extensoes: ['docx'],
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    rotulo: 'Word (.docx)',
  },
  // Word 97-2003. Its MIME is only accepted by the bucket after migration 008.
  doc: { extensoes: ['doc'], mime: 'application/msword', rotulo: 'Word 97-2003 (.doc)' },
  // Markdown travels as text/plain: it is plain text, and that MIME is
  // accepted by the bucket with or without migration 008.
  md: { extensoes: ['md', 'markdown'], mime: 'text/plain', rotulo: 'Markdown' },
  txt: { extensoes: ['txt'], mime: 'text/plain', rotulo: 'Texto' },
};

const POR_EXTENSAO: Record<string, FormatoDocumento> = Object.fromEntries(
  (Object.keys(FORMATOS) as FormatoDocumento[]).flatMap((formato) =>
    FORMATOS[formato].extensoes.map((ext) => [ext, formato])
  )
);

/** Value for `<input type="file" accept>`. */
export const ACCEPT_DOCUMENTOS = Object.keys(POR_EXTENSAO)
  .map((ext) => `.${ext}`)
  .join(',');

export const FORMATOS_ACEITOS_TEXTO = 'PDF, DOC, DOCX, MD ou TXT';

/**
 * @param fileName - Original file name
 * @returns The lowercased extension without the dot ('' when there is none)
 */
export function extensaoDe(fileName: string): string {
  const nome = fileName.trim().toLowerCase();
  const ponto = nome.lastIndexOf('.');
  return ponto > 0 ? nome.slice(ponto + 1) : '';
}

/**
 * @param fileName - Original file name
 * @returns The format, or null when the extension is not accepted
 */
export function formatoDoArquivo(fileName: string): FormatoDocumento | null {
  return POR_EXTENSAO[extensaoDe(fileName)] ?? null;
}

/**
 * @param fileName - Original file name
 * @returns Content type to upload with, or null for an unsupported file
 */
export function mimeParaEnvio(fileName: string): string | null {
  const formato = formatoDoArquivo(fileName);
  return formato ? FORMATOS[formato].mime : null;
}
