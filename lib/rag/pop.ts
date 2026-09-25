// POP-PMSC answers grounded on the indexed procedures (RAG). Pure module:
// the prompt, the source references and the citation check. The route that
// retrieves excerpts and calls the model lives in app/api/pop/consulta.

export interface FontePop {
  /** Number the answer cites as [n]. */
  n: number;
  documento_id: string;
  titulo: string;
  secao: string | null;
  pagina: number | null;
  texto: string;
}

export interface RespostaPop {
  pergunta: string;
  /** Answer written by the model, null when no model was available. */
  resposta: string | null;
  /** The model said the excerpts don't answer the question. */
  semResposta: boolean;
  fontes: FontePop[];
  /** "Provedor · modelo" that wrote the answer. */
  modelo: string | null;
  aviso?: string;
  cache_hit: boolean;
  tempo_ms: number;
}

export const SEM_RESPOSTA = 'Não encontrei essa informação nos POPs indexados.';

/**
 * "POP 1.01 — Abordagem · 3. SEQUÊNCIA DAS AÇÕES · p. 2"
 */
export function referenciaDaFonte(fonte: Pick<FontePop, 'titulo' | 'secao' | 'pagina'>): string {
  return [fonte.titulo, fonte.secao, fonte.pagina ? `p. ${fonte.pagina}` : null].filter(Boolean).join(' · ');
}

/**
 * Prompt that keeps the model on the excerpts: every statement cites one,
 * and an unanswerable question gets a fixed sentence instead of a guess.
 */
export function montarPrompt(pergunta: string, fontes: FontePop[]): string {
  const trechos = fontes.map((f) => `[${f.n}] ${referenciaDaFonte(f)}\n${f.texto}`).join('\n\n');
  return [
    'Você é o assistente de consulta aos POPs (Procedimentos Operacionais Padrão) da Polícia Militar de Santa Catarina.',
    'Responda à PERGUNTA usando exclusivamente os TRECHOS numerados abaixo.',
    '',
    'Regras:',
    '1. Indique a fonte de cada afirmação com o número do trecho entre colchetes, por exemplo [1] ou [2][3].',
    `2. Se os trechos não trouxerem a resposta, responda apenas: "${SEM_RESPOSTA}"`,
    '3. Não invente procedimentos, prazos, artigos de lei ou números que não estejam nos trechos.',
    '4. Para procedimentos, use passos numerados curtos, na ordem em que aparecem nos trechos.',
    '5. Seja direto: no máximo 12 linhas, em português do Brasil, sem saudações.',
    '',
    'TRECHOS:',
    trechos,
    '',
    `PERGUNTA: ${pergunta}`,
    '',
    'RESPOSTA:',
  ].join('\n');
}

/**
 * Drops citations to excerpts that were never provided ("[9]" with 6
 * sources) — the reader would click a source that doesn't exist.
 * @returns The cleaned answer and the excerpts it actually cites
 */
export function validarCitacoes(resposta: string, totalFontes: number): { texto: string; citadas: number[] } {
  const citadas = new Set<number>();
  const texto = resposta
    .replace(/\[(\d{1,2})\]/g, (marca, n: string) => {
      const numero = Number(n);
      if (numero >= 1 && numero <= totalFontes) {
        citadas.add(numero);
        return marca;
      }
      return '';
    })
    .replace(/[ \t]+([.,;:])/g, '$1')
    .trim();
  return { texto, citadas: [...citadas].sort((a, b) => a - b) };
}

/**
 * @returns True when the model answered with the "not in the POPs" sentence
 */
export function ehSemResposta(resposta: string): boolean {
  return resposta.toLowerCase().includes('não encontrei essa informação');
}
