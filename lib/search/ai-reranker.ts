import { rankingAmbiguo, type CandidatoReordenado } from './reranker';

export interface ResultadoRerankingIa<T extends CandidatoReordenado> {
  candidatos: T[];
  usouIa: boolean;
}

function promptReranking(consulta: string, candidatos: CandidatoReordenado[]): string {
  const opcoes = candidatos.slice(0, 10).map(({ id, titulo, texto }) => ({ id, titulo, trecho: texto.slice(0, 500) }));
  return [
    'Reordene somente os candidatos fornecidos pela compatibilidade com a consulta.',
    'Não crie IDs. Responda somente JSON no formato {"ids":["id1","id2"]}.',
    `Consulta: ${consulta}`,
    `Candidatos: ${JSON.stringify(opcoes)}`,
  ].join('\n');
}

function idsValidos(resposta: string, permitidos: Set<string>): string[] | null {
  try {
    const inicio = resposta.indexOf('{');
    const fim = resposta.lastIndexOf('}');
    if (inicio < 0 || fim < inicio) return null;
    const valor = JSON.parse(resposta.slice(inicio, fim + 1)) as { ids?: unknown };
    if (!Array.isArray(valor.ids) || valor.ids.length === 0 || valor.ids.some((id) => typeof id !== 'string' || !permitidos.has(id))) return null;
    const unicos = [...new Set(valor.ids as string[])];
    return unicos.length === valor.ids.length ? unicos : null;
  } catch {
    return null;
  }
}

export async function rerankearComIaSeAmbiguo<T extends CandidatoReordenado>(
  consulta: string,
  candidatos: T[],
  gerar: (prompt: string) => Promise<string>
): Promise<ResultadoRerankingIa<T>> {
  if (!rankingAmbiguo(candidatos)) return { candidatos, usouIa: false };
  try {
    const porId = new Map(candidatos.map((candidato) => [candidato.id, candidato]));
    const ordem = idsValidos(await gerar(promptReranking(consulta, candidatos)), new Set(porId.keys()));
    if (!ordem) return { candidatos, usouIa: false };
    const escolhidos = ordem.map((id) => porId.get(id)!);
    const usados = new Set(ordem);
    return { candidatos: [...escolhidos, ...candidatos.filter((item) => !usados.has(item.id))], usouIa: true };
  } catch {
    return { candidatos, usouIa: false };
  }
}
