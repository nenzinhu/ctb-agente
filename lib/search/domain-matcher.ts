export type MetodoEncontrado =
  | 'giria_exata'
  | 'fuzzy_giria'
  | 'fuzzy_oficial'
  | 'identificador_exato'
  | 'contexto_lexical';

export interface RegraAlias {
  termos: readonly string[];
  destinos: readonly string[];
}

export interface ResultadoMatcher<T> {
  item: T;
  scoreConfianca: number;
  metodoEncontrado: MetodoEncontrado;
  termosCorrespondentes: string[];
}

interface ConfiguracaoMatcher<T> {
  itens: readonly T[];
  obterId: (item: T) => string;
  obterRotulo: (item: T) => string;
  aliases?: readonly RegraAlias[];
  limiar?: number;
}

const PALAVRAS_LIGACAO = new Set(['a', 'ao', 'aos', 'as', 'com', 'da', 'das', 'de', 'do', 'dos', 'e', 'em', 'na', 'nas', 'no', 'nos', 'o', 'ou', 'para', 'por', 'um', 'uma']);

export function normalizarTextoMatcher(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\bs\s*\/\s*/g, 'sem ')
    .replace(/\bc\s*\/\s*/g, 'com ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(texto: string): string[] {
  return normalizarTextoMatcher(texto).split(' ').filter((token) => token.length >= 3 && !PALAVRAS_LIGACAO.has(token));
}

function distanciaDamerauLevenshtein(a: string, b: string): number {
  const matriz = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matriz[i][0] = i;
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo,
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matriz[i][j] = Math.min(matriz[i][j], matriz[i - 2][j - 2] + 1);
      }
    }
  }
  return matriz[a.length][b.length];
}

function similaridadeToken(a: string, b: string): number {
  if (a === b) return 1;
  if (/\d/.test(a) || /\d/.test(b)) return 0;
  const menor = a.length <= b.length ? a : b;
  const maior = a.length > b.length ? a : b;
  if (menor.length >= 4 && maior.startsWith(menor)) return 0.88;
  if (menor.length < 4) return 0;
  return Math.max(0, 1 - distanciaDamerauLevenshtein(a, b) / Math.max(a.length, b.length));
}

function similaridadeFrase(consulta: string, candidata: string): number {
  const consultaNormalizada = normalizarTextoMatcher(consulta);
  const candidataNormalizada = normalizarTextoMatcher(candidata);
  if (!consultaNormalizada || !candidataNormalizada) return 0;
  if (consultaNormalizada === candidataNormalizada) return 100;
  const termosConsulta = tokens(consultaNormalizada);
  const termosCandidata = tokens(candidataNormalizada);
  if (!termosConsulta.length || !termosCandidata.length) return 0;
  const base = termosConsulta.length <= termosCandidata.length ? termosConsulta : termosCandidata;
  const alvo = base === termosConsulta ? termosCandidata : termosConsulta;
  const qualidades = base.map((termo) => Math.max(0, ...alvo.map((outro) => similaridadeToken(termo, outro))));
  const cobertura = qualidades.filter((valor) => valor >= 0.72).length / base.length;
  if (cobertura < 0.7) return 0;
  return Math.min(94, Math.round(qualidades.reduce((soma, valor) => soma + valor, 0) / qualidades.length * 100));
}

function contemExpressao(texto: string, expressao: string): boolean {
  return (` ${normalizarTextoMatcher(texto)} `).includes(` ${normalizarTextoMatcher(expressao)} `);
}

export class FatoMatcher<T> {
  private readonly itensPorId: Map<string, T>;
  private readonly limiar: number;

  constructor(private readonly configuracao: ConfiguracaoMatcher<T>) {
    this.itensPorId = new Map(configuracao.itens.map((item) => [configuracao.obterId(item), item]));
    this.limiar = configuracao.limiar ?? 78;
  }

  buscar(textoUsuario: string, limite = 3): ResultadoMatcher<T>[] {
    const consulta = normalizarTextoMatcher(textoUsuario);
    if (!consulta || limite <= 0) return [];
    const termosConsulta = tokens(consulta);
    const consultaGenerica = termosConsulta.length === 0 || (termosConsulta.length === 1 && termosConsulta[0].length < 4);
    const encontrados = new Map<string, ResultadoMatcher<T>>();

    const registrar = (item: T, scoreConfianca: number, metodoEncontrado: MetodoEncontrado, termo?: string) => {
      if (scoreConfianca < this.limiar) return;
      const id = this.configuracao.obterId(item);
      const atual = encontrados.get(id);
      if (!atual || scoreConfianca > atual.scoreConfianca) {
        encontrados.set(id, {
          item,
          scoreConfianca: Math.min(100, Math.round(scoreConfianca)),
          metodoEncontrado,
          termosCorrespondentes: termo ? [termo] : [],
        });
      }
    };

    for (const regra of this.configuracao.aliases ?? []) {
      for (const termo of regra.termos) {
        const exata = contemExpressao(consulta, termo);
        const similaridade = similaridadeFrase(consulta, termo);
        const score = exata ? 98 : consultaGenerica ? 0 : Math.min(97, similaridade + 2);
        if (score < this.limiar) continue;
        for (const destino of regra.destinos) {
          const item = this.itensPorId.get(destino);
          if (item) registrar(item, score, exata ? 'giria_exata' : 'fuzzy_giria', termo);
        }
      }
    }

    if (!consultaGenerica) {
      for (const item of this.configuracao.itens) {
        const rotulo = this.configuracao.obterRotulo(item);
        registrar(item, similaridadeFrase(consulta, rotulo), 'fuzzy_oficial', rotulo);
      }
    }

    return [...encontrados.values()]
      .sort((a, b) => b.scoreConfianca - a.scoreConfianca || this.configuracao.obterRotulo(a.item).localeCompare(this.configuracao.obterRotulo(b.item), 'pt-BR'))
      .slice(0, limite);
  }
}
