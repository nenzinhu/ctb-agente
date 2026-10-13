import { ProviderChain } from '@/lib/ai/providers/chain';
import { buscarFichas, todasAsFichas } from '@/lib/mbft/fichas';
import { buscarPops, todosOsPops } from '@/lib/pop/pops';
import {
  capituloSemIA,
  promptCapitulo,
  tituloItem,
  type Capitulo,
  type FonteApostila,
  type ItemApostila,
  type Publico,
} from '@/lib/rag/apostila';
import { checkRateLimit, recordQuery } from '@/lib/ratelimit/limiter';
import { getCachedValue, setCachedValue } from '@/lib/response/cache';
import { carregarTrechosApostila, obterDocumentoApostila } from '@/lib/apostila/repositorio';
import { ConteudoApostilaExcessivo, prepararPartesApostila } from '@/lib/apostila/conteudo';
import { parseSelecaoPaginas, rotuloSelecaoPaginas, SelecaoPaginasInvalida } from '@/lib/apostila/paginas';
import type { CapituloApostila, PublicoApostila, SelecaoApostila } from '@/lib/apostila/tipos';
import { capituloDocumentoSemIA, promptCapituloDocumento } from '@/lib/rag/apostila';

const TEMPO_IA_MS = 40_000;
const CONCORRENCIA_APOSTILA = 3;

export interface PedidoApostilaDocumento {
  documentoId: string;
  selecao: SelecaoApostila;
  publico: PublicoApostila;
  titulo?: string;
}

type ErroApostilaDocumento =
  | 'rate_limit_exceeded'
  | 'ip_blocked'
  | 'not_found'
  | 'pagina_indisponivel'
  | 'paginas_sem_texto'
  | 'conteudo_excessivo'
  | 'selecao_invalida';

async function mapearComConcorrencia<T, R>(
  itens: T[],
  limite: number,
  executar: (item: T, indice: number) => Promise<R>
): Promise<R[]> {
  const resultados = new Array<R>(itens.length);
  let proximo = 0;
  async function trabalhador() {
    while (proximo < itens.length) {
      const indice = proximo++;
      resultados[indice] = await executar(itens[indice], indice);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, () => trabalhador()));
  return resultados;
}

export async function gerarApostilaDocumento(
  pedido: PedidoApostilaDocumento,
  ip: string
): Promise<
  | { titulo: string; selecaoRotulo: string; documento: Awaited<ReturnType<typeof obterDocumentoApostila>>; capitulos: CapituloApostila[] }
  | { erro: ErroApostilaDocumento; mensagem?: string }
> {
  const limite = await checkRateLimit(ip, { tipo: 'apostila', pergunta: `${pedido.documentoId}:${pedido.selecao.modo}` });
  if (!limite.allowed) return { erro: limite.blocked ? 'ip_blocked' : 'rate_limit_exceeded' };

  const documento = await obterDocumentoApostila(pedido.documentoId);
  if (!documento) return { erro: 'not_found' };

  let paginas: number[] | undefined;
  let chaveSelecao = 'inteiro';
  let selecaoRotulo = 'documento inteiro';
  if (pedido.selecao.modo === 'paginas') {
    if (documento.paginaMaximaDisponivel === null) return { erro: 'pagina_indisponivel' };
    try {
      const normalizada = parseSelecaoPaginas(pedido.selecao.intervalos, documento.paginaMaximaDisponivel);
      paginas = normalizada.paginas;
      chaveSelecao = normalizada.canonico;
      selecaoRotulo = rotuloSelecaoPaginas(normalizada);
    } catch (error) {
      if (error instanceof SelecaoPaginasInvalida) return { erro: 'selecao_invalida', mensagem: error.message };
      throw error;
    }
  }

  const trechos = await carregarTrechosApostila(documento, paginas);
  if (paginas) {
    const encontradas = new Set(trechos.map((trecho) => trecho.pagina).filter((pagina): pagina is number => pagina !== null));
    const faltantes = paginas.filter((pagina) => !encontradas.has(pagina));
    if (faltantes.length > 0) return { erro: 'paginas_sem_texto', mensagem: `Sem texto indexado nas páginas: ${faltantes.join(', ')}.` };
  }
  if (trechos.length === 0) return { erro: 'not_found' };

  let partes;
  try {
    partes = prepararPartesApostila(trechos);
  } catch (error) {
    if (error instanceof ConteudoApostilaExcessivo) return { erro: 'conteudo_excessivo', mensagem: error.message };
    throw error;
  }
  if (partes.length === 0) return { erro: 'not_found' };

  const inicio = Date.now();
  const chain = new ProviderChain();
  const capitulos = await mapearComConcorrencia(partes, CONCORRENCIA_APOSTILA, async (parte, indice) => {
    const chave = `apostila:v3:${documento.hashConteudo}:${chaveSelecao}:${pedido.publico}:${indice}`;
    const emCache = await getCachedValue<CapituloApostila>(chave);
    if (emCache) return emCache;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let capitulo: CapituloApostila;
    try {
      const resultado = await Promise.race([
        chain.generateRapido(promptCapituloDocumento(documento, parte, pedido.publico), 2200, 0.4, 1),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('tempo esgotado')), TEMPO_IA_MS);
        }),
      ]);
      capitulo = {
        id: `${documento.id}:${indice}`,
        titulo: `Parte ${indice + 1} — ${documento.titulo}`,
        texto: resultado.texto.trim(),
        paginas: parte.paginas,
        situacao: documento.situacao,
        modelo: `${resultado.provedor} · ${resultado.modelo}`,
      };
    } catch (error) {
      console.warn(`Capítulo ${indice + 1} da apostila usou o texto oficial:`, error);
      capitulo = capituloDocumentoSemIA(documento, parte);
    } finally {
      if (timer) clearTimeout(timer);
    }
    await setCachedValue(chave, capitulo, { pergunta: chave, modelo: capitulo.modelo ?? 'oficial', tempoMs: 0 });
    return capitulo;
  });

  await recordQuery(ip, `apostila documento ${documento.id}: ${chaveSelecao}`, {
    tipo: 'apostila', sucesso: true, tempoMs: Date.now() - inicio,
    modelo: capitulos.find((capitulo) => capitulo.modelo)?.modelo ?? 'oficial',
  }, limite.registroId);
  return {
    titulo: pedido.titulo?.trim() || `Apostila — ${documento.titulo}`,
    selecaoRotulo,
    documento,
    capitulos,
  };
}

const itemDe = (fonte: FonteApostila, id: string) =>
  fonte === 'mbft' ? todasAsFichas().find((f) => f.codigo === id) : todosOsPops().find((p) => p.numero === id);

/**
 * Official items for a theme, to pick the chapters from
 * @param fonte - MBFT sheets or POPs
 * @param tema - Words, code, article or POP number
 */
export function sugerirItens(fonte: FonteApostila, tema: string): ItemApostila[] {
  return fonte === 'mbft'
    ? buscarFichas(tema, 12).map((f) => ({ id: f.codigo, titulo: tituloItem('mbft', f) }))
    : buscarPops(tema, 12).map((p) => ({ id: p.numero, titulo: tituloItem('pop', p) }));
}

async function escreverCapitulo(chain: ProviderChain, fonte: FonteApostila, id: string, publico: Publico): Promise<Capitulo | null> {
  const item = itemDe(fonte, id);
  if (!item) return null;
  const titulo = tituloItem(fonte, item);

  // v2 discards chapters cached before the mixed-language pt-BR guard.
  const chave = `apostila:v2:${fonte}:${id}:${publico}`;
  const emCache = await getCachedValue<Capitulo>(chave);
  if (emCache) return emCache;

  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const resultado = await Promise.race([
      // One model per chapter: the chapters already run in parallel
      chain.generateRapido(promptCapitulo(fonte, item, publico), 2200, 0.4, 1),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('tempo esgotado')), TEMPO_IA_MS);
      }),
    ]);
    const capitulo: Capitulo = { id, titulo, texto: resultado.texto.trim(), modelo: `${resultado.provedor} · ${resultado.modelo}` };
    await setCachedValue(chave, capitulo, { pergunta: chave, modelo: capitulo.modelo ?? 'ia', tempoMs: 0 });
    return capitulo;
  } catch (error) {
    console.warn(`Handout chapter ${fonte}:${id} fell back to the official text:`, error);
    return { id, titulo, texto: capituloSemIA(fonte, item), modelo: null };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Write the handout: one chapter per item, in parallel. A chapter the models
 * can't write falls back to the official text, so the handout is never empty.
 */
export async function gerarApostila(
  fonte: FonteApostila,
  ids: string[],
  publico: Publico,
  ip: string
): Promise<{ capitulos: Capitulo[] } | { erro: 'rate_limit_exceeded' | 'ip_blocked' | 'not_found' }> {
  const limite = await checkRateLimit(ip, { tipo: 'apostila', pergunta: `${fonte}:${ids.join(',')}` });
  if (!limite.allowed) return { erro: limite.blocked ? 'ip_blocked' : 'rate_limit_exceeded' };

  const inicio = Date.now();
  const chain = new ProviderChain();
  const capitulos = (await Promise.all(ids.map((id) => escreverCapitulo(chain, fonte, id, publico)))).filter(
    (c): c is Capitulo => c !== null
  );
  if (capitulos.length === 0) return { erro: 'not_found' };

  await recordQuery(
    ip,
    `apostila ${fonte}: ${ids.join(', ')}`,
    { tipo: 'apostila', sucesso: true, tempoMs: Date.now() - inicio, modelo: capitulos.find((c) => c.modelo)?.modelo ?? 'oficial' },
    limite.registroId
  );
  return { capitulos };
}
