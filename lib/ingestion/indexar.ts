// One indexing pipeline for every source: a file uploaded from the panel
// (/api/ingestion/upload) or a document bundled with the app (/api/admin/acervo).
// Text → excerpts → document registry → embeddings/insert → cache invalidation.
import { chunkTextAsync } from './chunker';
import { stripPageMarkers } from './pdf-text';
import { processChunks, processTrechos, type ProcessingResult } from './processor';
import {
  MigrationPendingError,
  createDocument,
  deleteDocument,
  finalizeDocument,
  findDocumentByHash,
  hashConteudo,
  replacePreviousVersions,
  tituloDoArquivo,
  type Colecao,
  type DocumentoRegistro,
} from './documents';
import type { FormatoDocumento } from './formats';
import { invalidateResponseCache } from '@/lib/response/cache';

export type TipoNorma = 'lei' | 'resolucao' | 'portaria' | 'manual';

export interface IndexarEntrada {
  /** Extracted text (may carry page markers). */
  texto: string;
  fileName: string;
  formato: FormatoDocumento;
  paginas?: number;
  colecao: Colecao;
  titulo?: string;
  /** CTB only. */
  normaId?: string;
  documentType?: TipoNorma;
  dataPublicacao?: string;
  dataVigenciaInicio?: string;
  dataVigenciaFim?: string | null;
}

export type IndexarResultado =
  | { status: 'duplicado'; documento: DocumentoRegistro }
  | { status: 'vazio' }
  | { status: 'falhou'; chunkCount: number; resultado: ProcessingResult }
  | {
      status: 'indexado';
      documento: DocumentoRegistro | null;
      titulo: string;
      chunkCount: number;
      resultado: ProcessingResult;
      substituidos: number;
    };

/**
 * @throws MigrationPendingError when a POP is sent before migration 008
 */
export async function indexarDocumento(entrada: IndexarEntrada): Promise<IndexarResultado> {
  const { colecao, fileName } = entrada;

  // Laws are cut by article; POPs and manuals by their section headings.
  const modo = colecao !== 'ctb' || entrada.documentType === 'manual' ? 'secoes' : 'legal';
  const chunks = await chunkTextAsync(entrada.texto, undefined, modo);
  if (chunks.length === 0) return { status: 'vazio' };

  const textoPuro = stripPageMarkers(entrada.texto);
  const hash = hashConteudo(textoPuro);
  const titulo = entrada.titulo?.trim() || tituloDoArquivo(fileName);

  // Document registry (migration 008). A CTB document is still indexed
  // without it, the way it always was; the POP base needs it.
  let documento: DocumentoRegistro | null = null;
  try {
    const existente = await findDocumentByHash(colecao, hash);
    if (existente) return { status: 'duplicado', documento: existente };
    documento = await createDocument({
      colecao,
      titulo,
      nomeArquivo: fileName,
      formato: entrada.formato,
      hash,
      paginas: entrada.paginas,
      caracteres: textoPuro.length,
      normaId: colecao === 'ctb' ? entrada.normaId : undefined,
      tipo: colecao === 'ctb' ? entrada.documentType : undefined,
    });
  } catch (error) {
    if (!(error instanceof MigrationPendingError) || colecao !== 'ctb') throw error;
    console.warn('Migration 008 not applied: indexing the CTB document without the registry.');
  }

  const resultado =
    colecao !== 'ctb'
      ? await processTrechos({ chunks, documentoId: documento!.id, titulo })
      : await processChunks({
          chunks,
          normaId: entrada.normaId ?? 'ctb',
          documentType: entrada.documentType ?? 'lei',
          dataPublicacao: entrada.dataPublicacao,
          dataVigenciaInicio: entrada.dataVigenciaInicio,
          dataVigenciaFim: entrada.dataVigenciaFim,
          documentoId: documento?.id,
        });

  if (resultado.insertedCount === 0) {
    if (documento) await deleteDocument(documento.id).catch(() => undefined);
    return { status: 'falhou', chunkCount: chunks.length, resultado };
  }

  let substituidos = 0;
  if (documento) {
    await finalizeDocument(documento.id, resultado.insertedCount, resultado.semVetor);
    substituidos = await replacePreviousVersions(documento);
  }

  // The corpus changed: cached answers may cite outdated text. Best-effort —
  // a failed invalidation must not fail an indexing that actually landed.
  const removidos = await invalidateResponseCache();
  console.log(`Response cache invalidated: ${removidos} entries removed`);

  return { status: 'indexado', documento, titulo, chunkCount: chunks.length, resultado, substituidos };
}
