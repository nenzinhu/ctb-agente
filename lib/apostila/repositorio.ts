import { databaseAdminConfigured, supabaseAdmin } from '@/lib/db/client';
import {
  getDocumentsByIds,
  getDocumentWithHash,
  listDocumentsWithQualityStatus,
  type DocumentoRegistro,
} from '@/lib/ingestion/documents';
import type {
  DocumentoApostila,
  DocumentoApostilaInterno,
  TrechoApostila,
} from './tipos';

const LIMITE_PADRAO = 30;
const LIMITE_MAXIMO = 50;

type PaginaDisponivel = { documento_id: string; pagina_maxima: number };

function elegivel(documento: DocumentoRegistro): boolean {
  return (documento.situacao === 'vigente' || documento.situacao === 'revisar') && documento.trechos > 0;
}

function consultaPesquisavel(consulta: string): boolean {
  return /[\p{L}\p{N}]/u.test(consulta.normalize('NFKD'));
}

async function paginasDisponiveis(ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabaseAdmin.rpc('paginas_documentos_apostila', { documento_ids: ids });
  if (error) throw new Error(`Não foi possível conferir as páginas indexadas: ${error.message}`);
  return new Map(((data ?? []) as PaginaDisponivel[]).map((linha) => [linha.documento_id, linha.pagina_maxima]));
}

function publico(documento: DocumentoRegistro, paginas: Map<string, number>): DocumentoApostila {
  return {
    id: documento.id,
    titulo: documento.titulo,
    colecao: documento.colecao,
    paginas: documento.paginas,
    paginaMaximaDisponivel: paginas.get(documento.id) ?? null,
    trechos: documento.trechos,
    situacao: documento.situacao as DocumentoApostila['situacao'],
  };
}

export async function listarDocumentosApostila(
  consulta = '',
  limite = LIMITE_PADRAO
): Promise<DocumentoApostila[]> {
  if (!databaseAdminConfigured) return [];
  const quantidade = Math.max(1, Math.min(limite, LIMITE_MAXIMO));
  let ordenados: DocumentoRegistro[];
  const termo = consulta.trim().slice(0, 200);

  if (termo && consultaPesquisavel(termo)) {
    const { data, error } = await supabaseAdmin.rpc('search_documentos_apostila', {
      query_text: termo,
      limit_count: quantidade,
    });
    if (error) throw new Error(`Não foi possível pesquisar o acervo: ${error.message}`);
    const ids = ((data ?? []) as { documento_id: string }[]).map((item) => item.documento_id);
    const encontrados = await getDocumentsByIds(ids);
    const porId = new Map(encontrados.filter(elegivel).map((documento) => [documento.id, documento]));
    ordenados = ids.map((id) => porId.get(id)).filter((documento): documento is DocumentoRegistro => Boolean(documento));
  } else {
    const { documentos } = await listDocumentsWithQualityStatus();
    ordenados = documentos.filter(elegivel);
  }

  ordenados = ordenados.slice(0, quantidade);
  const paginas = await paginasDisponiveis(ordenados.map((documento) => documento.id));
  return ordenados.map((documento) => publico(documento, paginas));
}

export async function obterDocumentoApostila(id: string): Promise<DocumentoApostilaInterno | null> {
  if (!databaseAdminConfigured) return null;
  const documento = await getDocumentWithHash(id);
  if (!documento || !elegivel(documento)) return null;
  const paginas = await paginasDisponiveis([id]);
  return {
    ...publico(documento, paginas),
    hashConteudo: documento.hash_conteudo,
  };
}

type LinhaTrecho = {
  id: string;
  documento_id: string;
  secao?: string | null;
  numero_dispositivo?: string | null;
  pagina: number | null;
  ordem: number | null;
  texto: string;
};

export async function carregarTrechosApostila(
  documento: DocumentoApostilaInterno,
  paginas?: number[]
): Promise<TrechoApostila[]> {
  const tabela = documento.colecao === 'ctb' ? 'dispositivos' : 'documento_trechos';
  const campos = tabela === 'dispositivos'
    ? 'id, documento_id, numero_dispositivo, pagina, ordem, texto'
    : 'id, documento_id, secao, pagina, ordem, texto';
  const lote = 1_000;
  const linhas: LinhaTrecho[] = [];
  for (let inicio = 0; ; inicio += lote) {
    let query = supabaseAdmin
      .from(tabela)
      .select(campos)
      .eq('documento_id', documento.id);
    if (paginas) query = query.in('pagina', paginas);
    const { data, error } = await query
      .order('pagina', { ascending: true, nullsFirst: false })
      .order('ordem')
      .range(inicio, inicio + lote - 1);
    if (error) throw new Error(`Não foi possível carregar o conteúdo do documento: ${error.message}`);
    const recebidas = (data ?? []) as unknown as LinhaTrecho[];
    linhas.push(...recebidas);
    if (recebidas.length < lote) break;
  }

  return linhas
    .map((linha) => ({
      id: linha.id,
      documentoId: linha.documento_id,
      secao: linha.secao ?? linha.numero_dispositivo ?? null,
      pagina: linha.pagina,
      ordem: linha.ordem ?? 0,
      texto: linha.texto,
    }))
    .sort((a, b) => (a.pagina ?? Number.MAX_SAFE_INTEGER) - (b.pagina ?? Number.MAX_SAFE_INTEGER) || a.ordem - b.ordem);
}
