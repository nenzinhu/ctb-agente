export interface ResultadoAvaliacao {
  esperados: string[];
  retornados: string[];
}

export interface MetricasAvaliacao {
  hit1: number;
  hit3: number;
  mrr: number;
  falsosPositivos: number;
  positivos: number;
  negativos: number;
}

export function anonimizarConsultaAvaliacao(consulta: string): string {
  return consulta
    .replace(/^([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+)+)(?=\s+CPF\b)/u, '[PESSOA]')
    .replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF]')
    .replace(/\b[A-Z]{3}[0-9][A-Z0-9][0-9]{2}\b/gi, '[PLACA]')
    .replace(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?9?\d{4}[-\s]?\d{4}\b/g, '[TELEFONE]');
}

export function avaliarRanking(resultados: ResultadoAvaliacao[]): MetricasAvaliacao {
  const positivos = resultados.filter((item) => item.esperados.length > 0);
  const negativos = resultados.filter((item) => item.esperados.length === 0);
  const proporcao = (quantidade: number, total: number) => total === 0 ? 0 : quantidade / total;
  const posicoes = positivos.map((item) => item.retornados.findIndex((id) => item.esperados.includes(id)));
  return {
    hit1: proporcao(posicoes.filter((posicao) => posicao === 0).length, positivos.length),
    hit3: proporcao(posicoes.filter((posicao) => posicao >= 0 && posicao < 3).length, positivos.length),
    mrr: proporcao(posicoes.reduce((total, posicao) => total + (posicao >= 0 ? 1 / (posicao + 1) : 0), 0), positivos.length),
    falsosPositivos: proporcao(negativos.filter((item) => item.retornados.length > 0).length, negativos.length),
    positivos: positivos.length,
    negativos: negativos.length,
  };
}

export function dividirCasosSemVazamento<T extends { grupo: string }>(casos: T[], gruposTeste: string[]): {
  desenvolvimento: T[];
  teste: T[];
} {
  const reservados = new Set(gruposTeste);
  return {
    desenvolvimento: casos.filter((caso) => !reservados.has(caso.grupo)),
    teste: casos.filter((caso) => reservados.has(caso.grupo)),
  };
}

interface LinhaConsultaReal {
  pergunta?: string | null;
  tipo_consulta?: string | null;
  ip_endereco?: unknown;
}

export interface ConsultaRealPreparada {
  consulta: string;
  frequencia: number;
  tipo: string;
  revisada: false;
}

/** Produz candidatos anônimos para revisão; deliberadamente não retorna IP nem rótulo esperado. */
export function prepararConsultasReais(linhas: LinhaConsultaReal[]): ConsultaRealPreparada[] {
  const agrupadas = new Map<string, ConsultaRealPreparada>();
  for (const linha of linhas) {
    const consulta = anonimizarConsultaAvaliacao(linha.pergunta?.trim() ?? '');
    if (!consulta) continue;
    const tipo = linha.tipo_consulta?.trim() || 'desconhecido';
    const chave = `${tipo}\0${consulta.toLowerCase()}`;
    const existente = agrupadas.get(chave);
    if (existente) existente.frequencia++;
    else agrupadas.set(chave, { consulta, frequencia: 1, tipo, revisada: false });
  }
  return [...agrupadas.values()].sort((a, b) => b.frequencia - a.frequencia || a.consulta.localeCompare(b.consulta));
}
