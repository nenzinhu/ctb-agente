// Extract structured MBFT fields from the raw text of a `dispositivos` chunk.
// The MBFT chunk texts embed labeled sections ("Tipificação do Enquadramento:",
// "Infrator: Condutor Competência: …"), so no schema change is needed: this
// parser turns those labels back into data at render time. Old cached cards
// keep working because the card JSON itself is unchanged.

export interface MbftFields {
  /** "Art. 181, XVII" as written at the top of the sheet */
  amparo: string | null;
  tipificacao: string | null;
  infrator: string | null;
  competencia: string | null;
  constatacao: string | null;
  gravidade: string | null;
  /** "7" or "Não Computável" */
  pontuacao: string | null;
  penalidade: string | null;
  medidaAdministrativa: string | null;
  configuraCrime: string | null;
  quandoAutuar: string | null;
  quandoNaoAutuar: string | null;
  definicoes: string | null;
  exemplosObservacoes: string[];
}

/**
 * Labels of an MBFT sheet. The indexed text varies ("Quando AUTUAR" without
 * a colon, "Pode Configurar Infração Penal"), so each label is a pattern.
 * "Quando NÃO Autuar" is listed before "Quando Autuar" and the latter refuses
 * a NÃO, so they never match each other.
 */
type Chave = Exclude<keyof MbftFields, 'exemplosObservacoes' | 'amparo' | 'pontuacao'> | 'exemplos' | 'pontuacao';

const ROTULOS: { chave: Chave; regex: RegExp }[] = [
  { chave: 'tipificacao', regex: /Tipifica[çc][ãa]o do Enquadramento\s*:?/i },
  { chave: 'gravidade', regex: /Gravidade\s*:/i },
  { chave: 'penalidade', regex: /Penalidade\s*:/i },
  { chave: 'medidaAdministrativa', regex: /Medida Administrativa\s*:/i },
  { chave: 'configuraCrime', regex: /Pode Configurar (?:Crime de Tr[âa]nsito|Infra[çc][ãa]o Penal)\s*:?/i },
  { chave: 'infrator', regex: /Infrator\s*:/i },
  { chave: 'competencia', regex: /Compet[êe]ncia\s*:/i },
  { chave: 'pontuacao', regex: /Pontua[çc][ãa]o\s*:/i },
  { chave: 'constatacao', regex: /Constata[çc][ãa]o da Infra[çc][ãa]o\s*:/i },
  { chave: 'quandoNaoAutuar', regex: /Quando\s+N[ÃA]O\s+Autuar\s*:?/i },
  { chave: 'quandoAutuar', regex: /Quando\s+(?!N[ÃA]O)Autuar\s*:?/i },
  { chave: 'definicoes', regex: /Defini[çc][õo]es e Procedimentos\s*:?/i },
  { chave: 'exemplos', regex: /Exemplos do Campo de Observa[çc][õo]es do AIT\s*:?/i },
];

/** "Art. 181, XVII." / "Art. 165-A." at the start of a sheet */
const AMPARO = /^\s*(Art\.\s*\d+(?:-[A-Z])?(?:\s*,\s*(?:§\s*\d+º?|[IVXLC]+|inciso\s+[IVXLC]+))*(?:\s*,\s*al[íi]nea\s+["“]?[a-z]["”]?)?)\.?/i;

/** Every label occurrence, in text order */
function marcar(texto: string): { chave: Chave; inicio: number; fim: number }[] {
  const marcas: { chave: Chave; inicio: number; fim: number }[] = [];
  for (const { chave, regex } of ROTULOS) {
    const global = new RegExp(regex.source, 'gi');
    for (const m of texto.matchAll(global)) {
      const inicio = m.index ?? 0;
      // "Quando Autuar" inside "Quando NÃO Autuar" was already excluded by the lookahead
      if (!marcas.some((x) => inicio >= x.inicio && inicio < x.fim)) {
        marcas.push({ chave, inicio, fim: inicio + m[0].length });
      }
    }
  }
  return marcas.sort((a, b) => a.inicio - b.inicio);
}

/** Split a numbered block into top-level items ("1. … 1.1 … 2. …") */
function itens(valor: string): string[] {
  return valor
    .split(/(?=(?:^|\s)\d+\.\s)/)
    .map((item) => item.trim())
    .filter((item) => /^\d+\.\s/.test(item));
}

/**
 * Split numbered items into lists wherever the numbering restarts at 1.
 * The PDF columns (Quando autuar | Quando NÃO autuar | Exemplos) come out
 * of the extractor as consecutive lists under stacked, empty headers.
 */
function listas(valor: string): string[][] {
  const resultado: string[][] = [];
  for (const item of itens(valor)) {
    if (item.startsWith('1.') && !/^1\.\d/.test(item) || resultado.length === 0) resultado.push([]);
    resultado[resultado.length - 1].push(item);
  }
  return resultado.filter((l) => l.length > 0);
}

const VAZIO: MbftFields = {
  amparo: null,
  tipificacao: null,
  infrator: null,
  competencia: null,
  constatacao: null,
  gravidade: null,
  pontuacao: null,
  penalidade: null,
  medidaAdministrativa: null,
  configuraCrime: null,
  quandoAutuar: null,
  quandoNaoAutuar: null,
  definicoes: null,
  exemplosObservacoes: [],
};

/**
 * Parse the labeled MBFT sections out of a chunk text
 * @param texto - Raw text of a `dispositivos` chunk
 * @returns Structured fields; each is null when the chunk lacks it
 */
export function parseMbftFields(texto: string): MbftFields {
  if (!texto) return { ...VAZIO };

  const campos: MbftFields = { ...VAZIO, exemplosObservacoes: [] };
  campos.amparo = texto.match(AMPARO)?.[1]?.replace(/\s+/g, ' ').trim() ?? null;

  const marcas = marcar(texto);
  const valores: Partial<Record<Chave, string>> = {};
  marcas.forEach((marca, i) => {
    const valor = texto.slice(marca.fim, marcas[i + 1]?.inicio ?? texto.length).trim();
    if (valor && !valores[marca.chave]) valores[marca.chave] = valor;
  });

  const limpar = (v?: string) => v?.replace(/\s+/g, ' ').trim() || null;
  campos.tipificacao = limpar(valores.tipificacao);
  campos.gravidade = limpar(valores.gravidade);
  campos.penalidade = limpar(valores.penalidade);
  campos.medidaAdministrativa = limpar(valores.medidaAdministrativa);
  campos.configuraCrime = limpar(valores.configuraCrime);
  campos.infrator = limpar(valores.infrator);
  campos.competencia = limpar(valores.competencia);
  campos.pontuacao = limpar(valores.pontuacao);
  campos.constatacao = limpar(valores.constatacao);
  campos.definicoes = valores.definicoes && !/^\d+\.\s/.test(valores.definicoes) ? limpar(valores.definicoes) : null;

  const autuar = valores.quandoAutuar;
  const naoAutuar = valores.quandoNaoAutuar;
  const exemplos = valores.exemplos ?? '';
  if (autuar || naoAutuar) {
    campos.quandoAutuar = autuar ? limpar(autuar) : null;
    campos.quandoNaoAutuar = naoAutuar ? limpar(naoAutuar) : null;
    campos.exemplosObservacoes = itens(exemplos);
  } else {
    // Stacked headers: the lists follow the last one, in column order.
    const [primeira = [], segunda = [], ...resto] = listas(exemplos);
    const cabecalhosEmpilhados = marcas.some((m) => m.chave === 'quandoAutuar');
    if (cabecalhosEmpilhados && segunda.length > 0) {
      campos.quandoAutuar = primeira.join('\n');
      campos.quandoNaoAutuar = segunda.join('\n');
      campos.exemplosObservacoes = resto.flat();
    } else {
      campos.exemplosObservacoes = [...primeira, ...segunda, ...resto.flat()];
    }
  }

  return campos;
}

/** How many fields a parsed sheet filled */
function preenchidos(campos: MbftFields): number {
  return Object.values(campos).filter((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v))).length;
}

/**
 * Pick the MBFT chunk with the most labeled fields from a card's norms
 * @param textos - Raw texts of the retrieved norms
 * @returns Parsed fields from the richest chunk, or null when none has labels
 */
export function extrairMbftFields(textos: string[]): MbftFields | null {
  return listarFichasMbft(textos)[0] ?? null;
}

/**
 * Every distinct MBFT sheet among the retrieved norms, richest first. One
 * query can hit several enquadramentos (art. 181 has twenty incisos); the
 * same sheet indexed twice is kept once.
 * @param textos - Raw texts of the retrieved norms
 */
export function listarFichasMbft(textos: string[]): MbftFields[] {
  const porChave = new Map<string, MbftFields>();
  for (const texto of textos) {
    const campos = parseMbftFields(texto);
    if (preenchidos(campos) < 3 || !campos.tipificacao) continue;
    const chave = `${campos.amparo ?? ''}|${campos.tipificacao.toLowerCase()}`;
    const atual = porChave.get(chave);
    if (!atual || preenchidos(campos) > preenchidos(atual)) porChave.set(chave, campos);
  }
  return [...porChave.values()].sort((a, b) => preenchidos(b) - preenchidos(a));
}
