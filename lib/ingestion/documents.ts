// Registry of indexed files (table `documentos`, migration 008): one row per
// uploaded file, so the panel lists documents instead of thousands of
// excerpts, re-uploading a file replaces its previous version, and deleting
// a document removes its excerpts (ON DELETE CASCADE).
import crypto from 'crypto';
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import { chaveDoArquivo, type FormatoDocumento } from './formats';

export type Colecao = 'ctb' | 'pop';

export const COLECOES: Colecao[] = ['ctb', 'pop'];

export interface DocumentoRegistro {
  id: string;
  colecao: Colecao;
  titulo: string;
  nome_arquivo: string;
  formato: FormatoDocumento;
  norma_id: string | null;
  tipo: string | null;
  paginas: number | null;
  caracteres: number;
  trechos: number;
  trechos_sem_vetor: number;
  criado_em: string;
  atualizado_em: string;
}

/** CTB excerpts with no document row: seed data or uploads made before migration 008. */
export interface GrupoLegado {
  norma_id: string;
  tipo: string;
  trechos: number;
}

/** Response of GET /api/admin/documents. */
export interface DocumentosResposta {
  documentos: DocumentoRegistro[];
  legado: GrupoLegado[];
  pendentesVetor: number;
  migracaoPendente: boolean;
  bancoConfigurado: boolean;
  message?: string;
}

/** Thrown when the database lacks migration 008 (tables/functions missing). */
export class MigrationPendingError extends Error {
  constructor() {
    super('A base de documentos ainda não existe: aplique scripts/migrations-008-rag-indexacao.sql no Supabase.');
    this.name = 'MigrationPendingError';
  }
}

/**
 * Supabase error for a table, column or function that doesn't exist yet.
 * @param error - Error returned by the Supabase client
 */
export function isMissingSchemaError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  if (code && ['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703', '42883'].includes(code)) return true;
  const mensagem = (error as { message?: string } | null)?.message ?? String(error ?? '');
  return /does not exist|could not find the (table|function|.*column)|schema cache/i.test(mensagem);
}

/**
 * Hash of the extracted text: the same document sent again (even as another
 * format, or compressed) is recognized and not indexed twice.
 */
export function hashConteudo(texto: string): string {
  return crypto.createHash('sha256').update(texto.replace(/\s+/g, ' ').trim().toLowerCase()).digest('hex');
}

/**
 * Human title from a file name: "pop_1.01-abordagem.pdf" → "pop 1.01 abordagem".
 */
export function tituloDoArquivo(fileName: string): string {
  const semExtensao = fileName.replace(/\.[^.]+$/, '');
  const limpo = semExtensao.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (limpo || 'Documento').slice(0, 200);
}

const CAMPOS =
  'id, colecao, titulo, nome_arquivo, formato, norma_id, tipo, paginas, caracteres, trechos, trechos_sem_vetor, criado_em, atualizado_em';

/**
 * @returns The document with this content in the collection, if any
 */
export async function findDocumentByHash(colecao: Colecao, hash: string): Promise<DocumentoRegistro | null> {
  const { data, error } = await supabaseAdmin
    .from('documentos')
    .select(CAMPOS)
    .eq('colecao', colecao)
    .eq('hash_conteudo', hash)
    .maybeSingle();
  if (error) {
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    throw new Error(error.message);
  }
  return (data as DocumentoRegistro | null) ?? null;
}

export interface NovoDocumento {
  colecao: Colecao;
  titulo: string;
  nomeArquivo: string;
  formato: FormatoDocumento;
  hash: string;
  paginas?: number;
  caracteres: number;
  normaId?: string;
  tipo?: string;
}

/**
 * Registers a document before its excerpts are inserted (they reference it).
 * @throws MigrationPendingError when migration 008 is not applied
 */
export async function createDocument(novo: NovoDocumento): Promise<DocumentoRegistro> {
  const { data, error } = await supabaseAdmin
    .from('documentos')
    .insert({
      colecao: novo.colecao,
      titulo: novo.titulo,
      nome_arquivo: novo.nomeArquivo,
      formato: novo.formato,
      hash_conteudo: novo.hash,
      paginas: novo.paginas ?? null,
      caracteres: novo.caracteres,
      norma_id: novo.normaId ?? null,
      tipo: novo.tipo ?? null,
    })
    .select(CAMPOS)
    .single();
  if (error) {
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    throw new Error(`Não foi possível registrar o documento: ${error.message}`);
  }
  return data as DocumentoRegistro;
}

/**
 * Stores the final excerpt counts once indexing is done.
 */
export async function finalizeDocument(id: string, trechos: number, trechosSemVetor: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documentos')
    .update({ trechos, trechos_sem_vetor: trechosSemVetor, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('Failed to finalize document counts:', error);
}

/**
 * Removes earlier uploads of the same document, now that the new version is
 * indexed: the same file name up to format and copy suffixes (chaveDoArquivo),
 * so a PDF sent again as .txt, or as "(1)", replaces its clone instead of
 * doubling every search result. In the CTB, a different norma is never the
 * same document.
 * @returns How many previous versions were removed
 */
export async function replacePreviousVersions(novo: DocumentoRegistro): Promise<number> {
  const { data: candidatos, error: erroLeitura } = await supabaseAdmin
    .from('documentos')
    .select('id, nome_arquivo, norma_id')
    .eq('colecao', novo.colecao)
    .neq('id', novo.id);
  if (erroLeitura) {
    console.error('Failed to look for previous versions:', erroLeitura);
    return 0;
  }

  const chave = chaveDoArquivo(novo.nome_arquivo);
  const ids = ((candidatos ?? []) as Pick<DocumentoRegistro, 'id' | 'nome_arquivo' | 'norma_id'>[])
    .filter((doc) => chave && chaveDoArquivo(doc.nome_arquivo) === chave)
    .filter((doc) => !(novo.colecao === 'ctb' && novo.norma_id && doc.norma_id && doc.norma_id !== novo.norma_id))
    .map((doc) => doc.id);
  if (ids.length === 0) return 0;

  const { data, error } = await supabaseAdmin.from('documentos').delete().in('id', ids).select('id');
  if (error) {
    console.error('Failed to replace previous versions:', error);
    return 0;
  }
  return (data ?? []).length;
}

/**
 * Deletes a document and, by cascade, all of its excerpts.
 * @returns Whether a document was deleted
 */
export async function deleteDocument(id: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('documentos').delete().eq('id', id).select('id');
  if (error) {
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    throw new Error(error.message);
  }
  return (data ?? []).length > 0;
}

/**
 * @param colecao - Only this collection (all when omitted)
 * @returns Documents, newest first
 */
export async function listDocuments(colecao?: Colecao): Promise<DocumentoRegistro[]> {
  if (!databaseConfigured) return [];
  let query = supabaseAdmin.from('documentos').select(CAMPOS).order('criado_em', { ascending: false }).limit(500);
  if (colecao) query = query.eq('colecao', colecao);

  const { data, error } = await query;
  if (error) {
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    throw new Error(error.message);
  }
  return (data ?? []) as DocumentoRegistro[];
}
