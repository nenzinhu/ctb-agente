import { classificarIntencaoBusca } from './intent';
import { normalizarBusca } from './sinonimos';

export type DominioConsulta = 'ctb' | 'infracao' | 'pop' | 'fato_pmsc';
export type FonteIntencao = 'regra' | 'modelo_intencao';

export interface ClassificacaoDominio {
  dominio: DominioConsulta;
  confianca: number;
  fonte: FonteIntencao;
  sinais: string[];
  identificador?: string;
  modelo?: string;
}

export interface PredicaoModeloIntencao {
  dominio: DominioConsulta;
  confianca: number;
  modelo: string;
}

export type ModeloIntencao = (consulta: string) => Promise<PredicaoModeloIntencao>;

const DOMINIO_POR_INTENCAO = {
  codigo: 'infracao',
  artigo: 'ctb',
  pop: 'pop',
  infracao: 'infracao',
  natureza_pmsc: 'fato_pmsc',
  consulta_geral: 'ctb',
} as const satisfies Record<ReturnType<typeof classificarIntencaoBusca>['intencao'], DominioConsulta>;

/**
 * Classifica somente o domínio da pergunta. A função não produz conteúdo
 * jurídico: CTB, fichas, POPs e fatos continuam sendo recuperados pelo RAG.
 */
export function classificarDominioConsulta(consulta: string): ClassificacaoDominio {
  const base = classificarIntencaoBusca(consulta);
  const texto = normalizarBusca(consulta);

  if (base.identificador) {
    return {
      dominio: DOMINIO_POR_INTENCAO[base.intencao],
      confianca: base.confianca,
      fonte: 'regra',
      sinais: base.sinais,
      identificador: base.identificador,
    };
  }

  if (/\b(?:baculejo|revista pessoal|fundada suspeita|abordar|abordagem|prisao|conducao|uso progressivo|violencia domestica|maria da penha)\b/.test(texto)) {
    return { dominio: 'pop', confianca: 0.88, fonte: 'regra', sinais: ['vocabulario_operacional'] };
  }
  if (/\b(?:zap|whats(?:app)?|mensagem)\b.*\b(?:volante|dirig|veiculo|carro|moto)\b|\bvolante\b.*\b(?:zap|whats(?:app)?|mensagem)\b/.test(texto)) {
    return { dominio: 'infracao', confianca: 0.88, fonte: 'regra', sinais: ['giria_transito'] };
  }
  if (/\b(?:briga|desentendimento|ameaca|furto|roubo|agressao)\b/.test(texto) && /\b(?:natureza|fato|ocorrencia|vizinh|famil|rua|local)\w*\b/.test(texto)) {
    return { dominio: 'fato_pmsc', confianca: 0.86, fonte: 'regra', sinais: ['vocabulario_fato_pmsc'] };
  }
  if (/\b(?:som alto|perturbacao|pancadao|vias? de fato|perda de documentos?|acidente com vitima)\b/.test(texto)) {
    return { dominio: 'fato_pmsc', confianca: 0.86, fonte: 'regra', sinais: ['vocabulario_fato_pmsc'] };
  }

  return {
    dominio: DOMINIO_POR_INTENCAO[base.intencao],
    confianca: base.confianca,
    fonte: 'regra',
    sinais: base.sinais,
    identificador: base.identificador,
  };
}

/**
 * Permite conectar futuramente um modelo pequeno de intenção. Regras exatas e
 * classificações determinísticas fortes sempre vencem; previsões fracas ou
 * indisponíveis degradam para o classificador local.
 */
export async function resolverDominioConsulta(
  consulta: string,
  modelo?: ModeloIntencao,
  confiancaMinima = 0.75
): Promise<ClassificacaoDominio> {
  const local = classificarDominioConsulta(consulta);
  if (!modelo || local.identificador || local.confianca > 0.6) return local;

  try {
    const predicao = await modelo(consulta);
    if (predicao.confianca < confiancaMinima) return local;
    return {
      dominio: predicao.dominio,
      confianca: predicao.confianca,
      fonte: 'modelo_intencao',
      modelo: predicao.modelo,
      sinais: ['modelo_especializado'],
    };
  } catch {
    return local;
  }
}
