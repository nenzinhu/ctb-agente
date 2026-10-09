// Registry of indexed files (table `documentos`, migration 008): one row per
// uploaded file, so the panel lists documents instead of thousands of
// excerpts, re-uploading a file replaces its previous version, and deleting
// a document removes its excerpts (ON DELETE CASCADE).
import crypto from 'crypto';
import { databaseConfigured, supabaseAdmin } from '@/lib/db/client';
import type { SituacaoFonte } from '@/lib/quality/types';
import type { DocumentoMetadata } from '@/lib/quality/metadata';
import type { FormatoDocumento } from './formats';

export type Colecao = 'ctb' | 'pop' | 'natureza_potencial';

export const COLECOES: Colecao[] = ['ctb', 'pop', 'natureza_potencial'];

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
  fonte_oficial: string | null;
  versao: string | null;
  vigente_desde: string | null;
  conferido_em: string | null;
  situacao: SituacaoFonte;
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
  migracaoQualidadePendente: boolean;
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

/** Thrown when document metadata from migration 011 cannot be persisted. */
export class QualityMigrationPendingError extends Error {
  constructor() {
    super('A qualidade documental ainda não está configurada: aplique scripts/migrations-011-document-quality.sql no Supabase.');
    this.name = 'QualityMigrationPendingError';
  }
}

function isMissingQualityColumnError(error: unknown): boolean {
  const mensagem = (error as { message?: string } | null)?.message ?? '';
  return /(?:fonte_oficial|versao|vigente_desde|conferido_em|situacao).*(?:column|coluna)|(?:column|coluna).*(?:fonte_oficial|versao|vigente_desde|conferido_em|situacao)/i.test(mensagem);
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

const CAMPOS_LEGADOS =
  'id, colecao, titulo, nome_arquivo, formato, norma_id, tipo, paginas, caracteres, trechos, trechos_sem_vetor, criado_em, atualizado_em';
const CAMPOS = `${CAMPOS_LEGADOS}, fonte_oficial, versao, vigente_desde, conferido_em, situacao`;

function normalizarDocumento(registro: Record<string, unknown>): DocumentoRegistro {
  return {
    ...registro,
    fonte_oficial: typeof registro.fonte_oficial === 'string' ? registro.fonte_oficial : null,
    versao: typeof registro.versao === 'string' ? registro.versao : null,
    vigente_desde: typeof registro.vigente_desde === 'string' ? registro.vigente_desde : null,
    conferido_em: typeof registro.conferido_em === 'string' ? registro.conferido_em : null,
    situacao: registro.situacao === 'vigente' || registro.situacao === 'substituido'
      ? registro.situacao
      : 'revisar',
  } as DocumentoRegistro;
}

/**
 * @returns The document with this content in the collection, if any
 */
export async function findDocumentByHash(colecao: Colecao, hash: string): Promise<DocumentoRegistro | null> {
  let { data, error } = await supabaseAdmin
    .from('documentos')
    .select(CAMPOS)
    .eq('colecao', colecao)
    .eq('hash_conteudo', hash)
    .maybeSingle();
  if (error && isMissingSchemaError(error)) {
    ({ data, error } = await supabaseAdmin
      .from('documentos')
      .select(CAMPOS_LEGADOS)
      .eq('colecao', colecao)
      .eq('hash_conteudo', hash)
      .maybeSingle());
  }
  if (error) {
    if (isMissingQualityColumnError(error)) throw new QualityMigrationPendingError();
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    throw new Error(error.message);
  }
  return data ? normalizarDocumento(data as Record<string, unknown>) : null;
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
  fonteOficial?: string;
  versao?: string;
  vigenteDesde?: string;
  conferidoEm?: string;
  situacao?: SituacaoFonte;
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
      fonte_oficial: novo.fonteOficial ?? null,
      versao: novo.versao ?? null,
      vigente_desde: novo.vigenteDesde ?? null,
      conferido_em: novo.conferidoEm ?? null,
      situacao: novo.situacao ?? 'revisar',
    })
    .select(CAMPOS)
    .single();
  if (error) {
    if (isMissingQualityColumnError(error)) throw new QualityMigrationPendingError();
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    throw new Error(`Não foi possível registrar o documento: ${error.message}`);
  }
  return normalizarDocumento(data as Record<string, unknown>);
}

/**
 * Stores the final excerpt counts once indexing is done.
 */
export async function finalizeDocument(id: string, trechos: number, trechosSemVetor: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from('documentos')
    .update({ trechos, trechos_sem_vetor: trechosSemVetor, atualizado_em: new Date().toISOString() })
    .eq('id', id);
  if (error) console.error('Falha ao finalizar as contagens do documento:', error);
}

/**
 * Removes earlier uploads of the same file (same name in the collection and,
 * in the CTB, the same norma), now that the new version is indexed.
 * @returns How many previous versions were removed
 */
export async function replacePreviousVersions(novo: DocumentoRegistro): Promise<number> {
  let query = supabaseAdmin
    .from('documentos')
    .delete()
    .eq('colecao', novo.colecao)
    .eq('nome_arquivo', novo.nome_arquivo)
    .neq('id', novo.id);
  if (novo.colecao === 'ctb' && novo.norma_id) query = query.eq('norma_id', novo.norma_id);

  const { data, error } = await query.select('id');
  if (error) {
    console.error('Falha ao substituir as versões anteriores:', error);
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
export interface ListaDocumentosResultado {
  documentos: DocumentoRegistro[];
  migracaoQualidadePendente: boolean;
}

export async function listDocumentsWithQualityStatus(colecao?: Colecao): Promise<ListaDocumentosResultado> {
  if (!databaseConfigured) return { documentos: [], migracaoQualidadePendente: false };
  let query = supabaseAdmin.from('documentos').select(CAMPOS).order('criado_em', { ascending: false }).limit(500);
  if (colecao) query = query.eq('colecao', colecao);

  const respostaAtual = await query;
  let data: Record<string, unknown>[] | null = respostaAtual.data as Record<string, unknown>[] | null;
  let error = respostaAtual.error;
  let migracaoQualidadePendente = false;
  if (error && isMissingSchemaError(error)) {
    migracaoQualidadePendente = true;
    let queryLegada = supabaseAdmin
      .from('documentos')
      .select(CAMPOS_LEGADOS)
      .order('criado_em', { ascending: false })
      .limit(500);
    if (colecao) queryLegada = queryLegada.eq('colecao', colecao);
    const respostaLegada = await queryLegada;
    data = respostaLegada.data as Record<string, unknown>[] | null;
    error = respostaLegada.error;
  }
  if (error) {
    if (isMissingSchemaError(error)) throw new MigrationPendingError();
    throw new Error(error.message);
  }
  return {
    documentos: (data ?? []).map(normalizarDocumento),
    migracaoQualidadePendente,
  };
}

export async function listDocuments(colecao?: Colecao): Promise<DocumentoRegistro[]> {
  return (await listDocumentsWithQualityStatus(colecao)).documentos;
}

export async function updateDocumentMetadata(
  id: string,
  metadata: DocumentoMetadata,
): Promise<DocumentoRegistro> {
  const { data, error } = await supabaseAdmin
    .from('documentos')
    .update({
      fonte_oficial: metadata.fonteOficial,
      versao: metadata.versao,
      vigente_desde: metadata.vigenteDesde,
      conferido_em: metadata.conferidoEm,
      situacao: metadata.situacao,
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', id)
    .select(CAMPOS)
    .single();
  if (error) {
    if (isMissingQualityColumnError(error) || isMissingSchemaError(error)) {
      throw new QualityMigrationPendingError();
    }
    throw new Error(`Não foi possível atualizar o documento: ${error.message}`);
  }
  return normalizarDocumento(data as Record<string, unknown>);
}
