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
 * Prompt that keeps the model on the excerpts and has it organize them for
 * an officer on duty: a short answer, the steps in order, what to watch out
 * for and the legal basis, every statement citing an excerpt. An
 * unanswerable question gets a fixed sentence instead of a guess.
 */
export function montarPrompt(pergunta: string, fontes: FontePop[]): string {
  const trechos = fontes.map((f) => `[${f.n}] ${referenciaDaFonte(f)}\n${f.texto}`).join('\n\n');
  return [
    'Você é o assistente de consulta aos POPs (Procedimentos Operacionais Padrão) da Polícia Militar de Santa Catarina.',
    'Responda à PERGUNTA usando exclusivamente os TRECHOS numerados abaixo, organizando a resposta para um policial em serviço.',
    '',
    'Formato — use só as seções que os trechos sustentam, nesta ordem, com o título em negrito numa linha própria:',
    '**Resumo**',
    'Uma ou duas frases com a resposta direta.',
    '**Passo a passo**',
    '1. As ações na ordem em que aparecem nos trechos, uma por linha.',
    '**Atenção**',
    '- Erros a evitar e atividades críticas.',
    '**Base legal**',
    '- Leis e normas citadas nos trechos.',
    '',
    'Regras:',
    '1. Indique a fonte de cada afirmação com o número do trecho entre colchetes, por exemplo [1] ou [2][3].',
    `2. Se os trechos não trouxerem a resposta, responda apenas: "${SEM_RESPOSTA}"`,
    '3. Não invente procedimentos, prazos, artigos de lei ou números que não estejam nos trechos.',
    '4. Quando ajudar, diga de qual POP vem a orientação pelo número e nome (ex.: "POP 002 — Busca pessoal").',
    '5. Seja direto: no máximo 20 linhas, em português do Brasil, sem saudações.',
    '',
    'TRECHOS:',
    trechos,
    '',
    `PERGUNTA: ${pergunta}`,
    '',
    'RESPOSTA:',
  ].join('\n');
}

export interface FonteAgrupada extends FontePop {
  /** Where in the POP: "SEQUÊNCIA DAS AÇÕES · p. 7". */
  local: string;
}

export interface GrupoDeFontes {
  /** "POP 002 — BUSCA PESSOAL (TÉCNICA POLICIAL)", or the document title. */
  pop: string;
  fontes: FonteAgrupada[];
}

/**
 * Groups the excerpts by the POP they belong to, best-ranked POP first, so
 * the reader sees "POP 002 → Sequência das ações p. 7, Erros p. 9" instead
 * of a loose list. Excerpts outside a numbered POP group under their document.
 */
export function agruparFontesPorPop(fontes: FontePop[]): GrupoDeFontes[] {
  const grupos = new Map<string, GrupoDeFontes>();
  for (const fonte of fontes) {
    const partes = (fonte.secao ?? '').split(' › ').filter(Boolean);
    const ehPop = partes.length > 0 && /^POP\b/i.test(partes[0]);
    const pop = ehPop ? partes[0] : fonte.titulo;
    const secao = (ehPop ? partes.slice(1) : partes).join(' › ');
    const local = [secao || null, fonte.pagina ? `p. ${fonte.pagina}` : null].filter(Boolean).join(' · ');
    const grupo = grupos.get(pop) ?? { pop, fontes: [] };
    grupo.fontes.push({ ...fonte, local });
    grupos.set(pop, grupo);
  }
  return [...grupos.values()];
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
