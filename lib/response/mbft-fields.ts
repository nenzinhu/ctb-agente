// Extract structured MBFT fields from the raw text of a `dispositivos` chunk.
// The MBFT chunk texts embed labeled sections ("Tipificação do Enquadramento:",
// "Infrator: Condutor Competência: …"), so no schema change is needed: this
// parser turns those labels back into data at render time. Old cached cards
// keep working because the card JSON itself is unchanged.

export interface MbftFields {
  tipificacao: string | null;
  infrator: string | null;
  competencia: string | null;
  constatacao: string | null;
  gravidade: string | null;
  penalidade: string | null;
  medidaAdministrativa: string | null;
  configuraCrime: string | null;
  quandoAutuar: string | null;
  quandoNaoAutuar: string | null;
  definicoes: string | null;
  exemplosObservacoes: string[];
}

/** Labels that open a labeled value, in the exact casing used by the MBFT. */
const ROTULOS = [
  'Tipificação do Enquadramento:',
  'Gravidade:',
  'Penalidade:',
  'Medida Administrativa:',
  'Pode Configurar Crime de Trânsito:',
  'Infrator:',
  'Competência:',
  'Constatação da Infração:',
  'Quando Autuar:',
  'Quando NÃO Autuar:',
  'Definições e Procedimentos:',
  'Exemplos do Campo de Observações do AIT:',
] as const;

const INICIO_PROXIMO_BLOCO = ROTULOS.map((rotulo) => ({
  rotulo,
  regex: new RegExp(`${rotulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'),
}));

/**
 * Find where the value of a label ends: the start of the next known label
 * or the end of the text. Labels are matched case-sensitively on purpose —
 * "Quando NÃO Autuar" must not match "Quando Autuar".
 * @param texto - Raw chunk text
 * @param desde - Index right after the label
 * @returns Start index and label of the next section, when any
 */
function proximoRotuloApos(texto: string, desde: number): { rotulo: string; inicio: number } | null {
  let melhor: { rotulo: string; inicio: number } | null = null;
  for (const { rotulo, regex } of INICIO_PROXIMO_BLOCO) {
    regex.lastIndex = desde;
    const match = regex.exec(texto);
    if (match && (melhor === null || match.index < melhor.inicio)) {
      melhor = { rotulo, inicio: match.index };
    }
  }
  return melhor;
}

/**
 * Extract the raw value that follows a label
 * @param texto - Raw chunk text
 * @param rotulo - Label ending with ":" (e.g. "Infrator:")
 * @returns Trimmed value, or null when the label is absent
 */
function valorApos(texto: string, rotulo: string): string | null {
  const inicio = texto.indexOf(rotulo);
  if (inicio === -1) return null;
  const desde = inicio + rotulo.length;
  const fim = proximoRotuloApos(texto, desde);
  const valor = texto.slice(desde, fim ? fim.inicio : undefined).trim();
  return valor || null;
}

/** Split "Exemplos…: 1. … 1.1 … 2. …" into top-level numbered items. */
function extrairExemplos(valor: string | null): string[] {
  if (!valor) return [];
  return valor
    .split(/(?=(?:^|\s)\d+\.\s)/)
    .map((item) => item.trim())
    .filter((item) => /^\d+\./.test(item));
}

/**
 * Parse the labeled MBFT sections out of a chunk text
 * @param texto - Raw text of a `dispositivos` chunk
 * @returns Structured fields; each is null when the chunk lacks the label
 */
export function parseMbftFields(texto: string): MbftFields {
  if (!texto) {
    return {
      tipificacao: null,
      infrator: null,
      competencia: null,
      constatacao: null,
      gravidade: null,
      penalidade: null,
      medidaAdministrativa: null,
      configuraCrime: null,
      quandoAutuar: null,
      quandoNaoAutuar: null,
      definicoes: null,
      exemplosObservacoes: [],
    };
  }

  return {
    tipificacao: valorApos(texto, 'Tipificação do Enquadramento:'),
    infrator: valorApos(texto, 'Infrator:'),
    // The MBFT packs "Pontuação: 7" right after the competência sentence.
    competencia: valorApos(texto, 'Competência:')?.replace(/\s*Pontua[çc][ãa]o:\s*\d+\s*$/i, '') || null,
    constatacao: valorApos(texto, 'Constatação da Infração:'),
    gravidade: valorApos(texto, 'Gravidade:'),
    penalidade: valorApos(texto, 'Penalidade:'),
    medidaAdministrativa: valorApos(texto, 'Medida Administrativa:'),
    configuraCrime: valorApos(texto, 'Pode Configurar Crime de Trânsito:'),
    quandoAutuar: valorApos(texto, 'Quando Autuar:'),
    quandoNaoAutuar: valorApos(texto, 'Quando NÃO Autuar:'),
    definicoes: valorApos(texto, 'Definições e Procedimentos:'),
    exemplosObservacoes: extrairExemplos(valorApos(texto, 'Exemplos do Campo de Observações do AIT:')),
  };
}

/**
 * Pick the MBFT chunk with the most labeled fields from a card's norms
 * @param textos - Raw texts of the retrieved norms
 * @returns Parsed fields from the richest chunk, or null when none has labels
 */
export function extrairMbftFields(textos: string[]): MbftFields | null {
  let melhor: MbftFields | null = null;
  let melhorPontuacao = 0;

  for (const texto of textos) {
    const campos = parseMbftFields(texto);
    const pontuacao = Object.values(campos).filter((v) =>
      Array.isArray(v) ? v.length > 0 : Boolean(v)
    ).length;
    if (pontuacao > melhorPontuacao) {
      melhor = campos;
      melhorPontuacao = pontuacao;
    }
  }

  return melhorPontuacao >= 3 ? melhor : null;
}
