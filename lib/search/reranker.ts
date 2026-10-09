import { classificarIntencaoBusca, type ClassificacaoIntencao, type IntencaoBusca } from './intent';
import { palavrasBusca } from './lexical';
import { normalizarBusca } from './sinonimos';

export type ColecaoRanking = 'ctb' | 'mbft' | 'pop' | 'natureza_pmsc';

export interface CandidatoRanking {
  id: string;
  colecao: ColecaoRanking;
  titulo: string;
  texto: string;
  posicaoLexical?: number;
  posicaoVetorial?: number;
  scoreLexical?: number;
  similaridadeVetorial?: number;
  campos?: Record<string, string | undefined>;
}

export interface CandidatoReordenado extends CandidatoRanking {
  score: number;
  motivos: string[];
}

const PESO_INTENCAO: Record<IntencaoBusca, Partial<Record<ColecaoRanking, number>>> = {
  codigo: { mbft: 1 },
  artigo: { ctb: 1 },
  pop: { pop: 1 },
  infracao: { mbft: 1, ctb: 0.7 },
  natureza_pmsc: { natureza_pmsc: 1 },
  consulta_geral: { ctb: 0.25, mbft: 0.25, pop: 0.25, natureza_pmsc: 0.25 },
};

function referenciaNormalizada(valor: string): string {
  return normalizarBusca(valor).replace(/[^a-z0-9]+/g, ' ').trim();
}

export function reordenarCandidatos(
  consulta: string,
  classificacao: ClassificacaoIntencao,
  candidatos: CandidatoRanking[]
): CandidatoReordenado[] {
  const termos = palavrasBusca(consulta);
  const identificador = classificacao.identificador ? referenciaNormalizada(classificacao.identificador) : null;

  return candidatos.map((candidato) => {
    const motivos: string[] = [];
    const conteudo = referenciaNormalizada(`${candidato.titulo} ${candidato.texto} ${Object.values(candidato.campos ?? {}).join(' ')}`);
    const exato = identificador !== null && conteudo.includes(identificador);
    if (exato) motivos.push('identificador exato');

    const cobertura = termos.length === 0 ? 0 : termos.filter((termo) => conteudo.includes(termo)).length / termos.length;
    const lexical = candidato.posicaoLexical ? 1 / candidato.posicaoLexical : 0;
    const vetorial = candidato.posicaoVetorial ? 1 / candidato.posicaoVetorial : 0;
    const intencao = PESO_INTENCAO[classificacao.intencao][candidato.colecao] ?? 0;
    const tipoCompativel = classificacao.intencao === 'infracao' && candidato.campos?.tipo === 'infracao' ? 1.2 : 0;
    if (tipoCompativel) motivos.push('compatível com infração');
    if (cobertura > 0) motivos.push(`cobertura ${Math.round(cobertura * 100)}%`);

    const score = (exato ? 100 : 0) + cobertura * 2 + lexical * 0.8 + vetorial * 0.5 + intencao + tipoCompativel;
    return { ...candidato, score, motivos };
  }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}

export function rankingAmbiguo(resultados: CandidatoReordenado[], margem = 0.05): boolean {
  if (resultados.length < 2 || resultados[0].motivos.includes('identificador exato')) return false;
  return resultados[0].score - resultados[1].score <= margem;
}

interface LinhaBusca {
  id: string;
  texto: string;
  numero_dispositivo?: string;
  titulo?: string;
  secao?: string | null;
  rank?: number;
  similarity?: number;
}

function tipoCtb(numero?: string): string | undefined {
  const artigo = Number(/art\.\s*(\d+)/i.exec(numero ?? '')?.[1]);
  return artigo >= 161 && artigo <= 255 ? 'infracao' : undefined;
}

/** Combina candidatos das buscas do banco e preserva os sinais usados no reranking. */
export function reordenarListasBusca<T extends LinhaBusca>(
  consulta: string,
  colecao: ColecaoRanking,
  lexical: T[],
  vetorial: T[]
): Array<T & CandidatoReordenado> {
  const unidos = new Map<string, T & CandidatoRanking>();
  lexical.forEach((item, indice) => unidos.set(item.id, {
    ...item,
    colecao,
    titulo: item.numero_dispositivo ?? item.titulo ?? '',
    posicaoLexical: indice + 1,
    scoreLexical: item.rank,
    campos: { artigo: item.numero_dispositivo, secao: item.secao ?? undefined, tipo: colecao === 'ctb' ? tipoCtb(item.numero_dispositivo) : undefined },
  }));
  vetorial.forEach((item, indice) => {
    const existente = unidos.get(item.id);
    unidos.set(item.id, {
      ...item,
      ...existente,
      colecao,
      titulo: existente?.titulo ?? item.numero_dispositivo ?? item.titulo ?? '',
      posicaoVetorial: indice + 1,
      similaridadeVetorial: item.similarity,
      campos: existente?.campos ?? { artigo: item.numero_dispositivo, secao: item.secao ?? undefined, tipo: colecao === 'ctb' ? tipoCtb(item.numero_dispositivo) : undefined },
    } as T & CandidatoRanking);
  });
  return reordenarCandidatos(consulta, classificarIntencaoBusca(consulta), [...unidos.values()]) as Array<T & CandidatoReordenado>;
}
