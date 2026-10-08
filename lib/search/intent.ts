import { codigoMbft, extractArticleRef, numeroPop } from '@/lib/query/router';
import { normalizarBusca } from './sinonimos';

export type IntencaoBusca = 'codigo' | 'artigo' | 'pop' | 'infracao' | 'natureza_pmsc' | 'consulta_geral';

export interface ClassificacaoIntencao {
  intencao: IntencaoBusca;
  confianca: number;
  identificador?: string;
  sinais: string[];
}

export function classificarIntencaoBusca(consulta: string): ClassificacaoIntencao {
  const codigo = codigoMbft(consulta);
  if (codigo) return { intencao: 'codigo', confianca: 1, identificador: codigo, sinais: ['codigo_exato'] };

  const artigo = extractArticleRef(consulta.replace(/\s+do\s+ctb\b/gi, ''));
  if (artigo) return { intencao: 'artigo', confianca: 1, identificador: artigo, sinais: ['artigo_exato'] };

  const pop = numeroPop(consulta);
  if (pop) return { intencao: 'pop', confianca: 1, identificador: pop, sinais: ['pop_exato'] };

  const texto = normalizarBusca(consulta);
  if (/\b(?:natureza|fato comunicado|fato constatado|ocorrencia)\b|\b(?:suicid|cadaver|morto|vias de fato)\b/.test(texto)) {
    return { intencao: 'natureza_pmsc', confianca: 0.88, sinais: ['vocabulario_natureza'] };
  }
  if (/\b(?:pop|procedimento|proceder|algema|busca pessoal|abordagem|barreira policial)\b/.test(texto)) {
    return { intencao: 'pop', confianca: 0.84, sinais: ['vocabulario_procedimento'] };
  }
  if (/\b(?:infracao|condutor|dirigir|veiculo|moto|carro|cnh|capacete|celular|estacion|transitar|ultrapass)\w*\b/.test(texto)) {
    return { intencao: 'infracao', confianca: 0.82, sinais: ['vocabulario_transito'] };
  }
  return { intencao: 'consulta_geral', confianca: 0.5, sinais: [] };
}
