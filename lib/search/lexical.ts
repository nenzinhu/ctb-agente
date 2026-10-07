import { conceitosDaConsulta, normalizarBusca } from './sinonimos';

const VAZIAS = new Set((
  'que com para por pela pelo nos nas dos das uma uns umas the via quando como onde esta este isso essa ' +
  'ser ter tem sua seu qual quais deve devo fazer procedimento procedimentos proceder pop pops policial policia militar ' +
  'posso pode permitido permite preciso gostaria saber consulta consultar sobre enquadramento codigo infracao ' +
  'situacao favor maneira forma artigo art uso usar usando utilizar'
).split(' '));

export function palavrasBusca(texto: string): string[] {
  return [...new Set(normalizarBusca(texto).split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !VAZIAS.has(p)))];
}

// Restrict stemming to productive verbal forms; sharing an arbitrary first
// five letters (e.g. transporte / transitar) is not a match.
function radical(palavra: string): string {
  return palavra.length >= 7 ? palavra.replace(/(?:ando|endo|indo|ados|adas|ado|ada|ar|er|ir)$/, '') : palavra;
}

/** Bounded Damerau-Levenshtein: adjacent transpositions count as one typo. */
function distancia(a: string, b: string, limite: number): number {
  if (Math.abs(a.length - b.length) > limite) return limite + 1;
  let anterior = Array.from({ length: b.length + 1 }, (_, i) => i);
  let antesDaAnterior = anterior;
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(atual[j - 1] + 1, anterior[j] + 1, anterior[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        atual[j] = Math.min(atual[j], antesDaAnterior[j - 2] + 1);
      }
    }
    if (Math.min(...atual) > limite) return limite + 1;
    antesDaAnterior = anterior;
    anterior = atual;
  }
  return anterior[b.length];
}

export function similaridadePalavra(consulta: string, palavra: string): number {
  if (consulta === palavra) return 1;
  // Identifiers are never corrected by fuzzy text matching.
  if (/\d/.test(consulta) || /\d/.test(palavra)) return 0;
  if (consulta.length >= 4 && palavra.startsWith(consulta)) return 0.88;
  if (consulta.length >= 5 && palavra.length >= 5 && radical(consulta) === radical(palavra)) return 0.86;
  if (consulta.length < 5 || palavra.length < 5) return 0;
  const limite = consulta.length >= 9 && palavra.length >= 9 ? 2 : 1;
  const diferenca = distancia(consulta, palavra, limite);
  return diferenca <= limite ? (diferenca === 1 ? 0.72 : 0.6) : 0;
}

export interface DocumentoBusca<T> {
  item: T;
  titulo: string;
  corpo: string;
}

export interface IndiceBusca<T> {
  documentos: Array<{ item: T; titulo: Set<string>; corpo: Set<string> }>;
  frequencias: Map<string, number>;
}

/** Built once per bundled collection, also usable with small test fixtures. */
export function criarIndiceBusca<T>(documentos: DocumentoBusca<T>[]): IndiceBusca<T> {
  const frequencias = new Map<string, number>();
  return {
    documentos: documentos.map(({ item, titulo, corpo }) => {
      const t = new Set(palavrasBusca(titulo));
      const c = new Set(palavrasBusca(corpo));
      for (const palavra of new Set([...t, ...c])) frequencias.set(palavra, (frequencias.get(palavra) ?? 0) + 1);
      return { item, titulo: t, corpo: c };
    }),
    frequencias,
  };
}

/** Accent-insensitive retrieval, weighted by field, rarity and query coverage. */
export function buscarNoIndice<T>(consulta: string, indice: IndiceBusca<T>, limite: number): T[] {
  if (limite <= 0) return [];
  const { restante, alternativas } = conceitosDaConsulta(consulta);
  const grupos = [
    ...palavrasBusca(restante).map((p) => [[p]]),
    ...alternativas.map((grupo) => grupo.map(palavrasBusca).filter((p) => p.length > 0)),
  ].filter((g) => g.length > 0).slice(0, 24);
  if (!grupos.length || grupos.every((g) => g.every((alt) => alt.every((p) => /^(sem|nao|\d+)$/.test(p))))) return [];

  // Resolve each term against the vocabulary once, instead of running edit
  // distance for every document. Exact matches always outrank typo matches.
  const correspondencias = new Map<string, Array<{ palavra: string; qualidade: number; idf: number }>>();
  for (const termo of new Set(grupos.flat(2))) {
    const candidatos = [];
    const temExata = indice.frequencias.has(termo);
    for (const [palavra, frequencia] of indice.frequencias) {
      const qualidade = similaridadePalavra(termo, palavra);
      // Do not "correct" a valid term into an unrelated nearby word, such as
      // segurando → segurança. Prefixes and verb forms still remain useful.
      if (temExata && qualidade < 0.8) continue;
      if (qualidade) candidatos.push({ palavra, qualidade, idf: 1 + Math.log(1 + indice.documentos.length / (1 + frequencia)) });
    }
    correspondencias.set(termo, candidatos);
  }

  const resultados = indice.documentos.map(({ item, titulo, corpo }) => {
    let pontos = 0;
    let cobertura = 0;
    for (const grupo of grupos) {
      let melhor = 0;
      for (const alternativa of grupo) {
        const valores = alternativa.map((termo) => {
          let valor = 0;
          for (const { palavra, qualidade, idf } of correspondencias.get(termo) ?? []) {
            const campo = titulo.has(palavra) ? 3 : corpo.has(palavra) ? 1 : 0;
            valor = Math.max(valor, campo * qualidade * idf);
          }
          return valor;
        });
        // Multiword synonyms must match every meaningful word. Score a concept
        // once, regardless of how many aliases matched the same source.
        if (valores.every((v) => v > 0)) melhor = Math.max(melhor, valores.reduce((a, b) => a + b, 0) / valores.length);
      }
      if (melhor > 0) cobertura++;
      pontos += melhor;
    }
    return { item, pontos: pontos * (0.5 + 0.5 * cobertura / grupos.length), cobertura };
  }).filter((r) => r.pontos > 0 && r.cobertura >= Math.ceil(grupos.length / 2));

  // If sources cover all meaningful concepts, do not add alternatives that
  // cover only a generic word. Missing concepts must not be hidden by rarity.
  const coberturaMaxima = Math.max(0, ...resultados.map((r) => r.cobertura));
  const completos = resultados.filter((r) => r.cobertura === coberturaMaxima);
  const melhor = Math.max(0, ...completos.map((r) => r.pontos));
  return completos.filter((r) => r.pontos >= melhor * 0.45)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite).map((r) => r.item);
}

/** Preserve a contiguous source passage around the query, rather than always
 * cutting off the end of a long POP section. Overlap retains nearby context. */
export function trechoDaConsulta(texto: string, consulta: string, limite = 3500): string {
  if (texto.length <= limite) return texto;
  if (!consulta.trim()) return `${texto.slice(0, limite)}…`;
  const janelas: Array<{ inicio: number; fim: number; texto: string }> = [];
  let inicio = 0;
  while (inicio < texto.length) {
    let fim = Math.min(texto.length, inicio + limite);
    if (fim < texto.length) {
      const quebra = Math.max(texto.lastIndexOf('\n', fim), texto.lastIndexOf(' ', fim));
      if (quebra > inicio + limite / 2) fim = quebra;
    }
    janelas.push({ inicio, fim, texto: texto.slice(inicio, fim) });
    if (fim === texto.length) break;
    const proximo = Math.max(inicio + 1, fim - Math.floor(limite / 3));
    const quebra = texto.indexOf('\n', proximo);
    const espaco = texto.indexOf(' ', proximo);
    inicio = quebra >= proximo && quebra < fim ? quebra + 1 : espaco >= proximo && espaco < fim ? espaco + 1 : proximo;
  }
  const indice = criarIndiceBusca(janelas.map((janela) => ({ item: janela, titulo: '', corpo: janela.texto })));
  const melhor = buscarNoIndice(consulta, indice, 1)[0] ?? janelas[0];
  return `${melhor.inicio > 0 ? '…' : ''}${melhor.texto}${melhor.fim < texto.length ? '…' : ''}`;
}
