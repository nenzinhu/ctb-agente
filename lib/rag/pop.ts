// POP-PMSC answers grounded on the indexed procedures (RAG). Pure module:
// the prompt, the source references and the citation check. The route that
// retrieves excerpts and calls the model lives in app/api/pop/consulta.
import type { Pop } from '@/lib/pop/parser';

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
  /** The matching POPs from the bundled manual, complete, best first */
  pops?: Pop[];
  /** Written from the model's general knowledge: the indexed POPs had nothing. */
  geral?: boolean;
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
 * Prompt for when the indexed POPs have nothing on the question: the model
 * answers from general police doctrine, without pretending to quote a POP.
 */
export function montarPromptGeral(pergunta: string): string {
  return [
    'Você é um instrutor de procedimentos operacionais da Polícia Militar (Brasil).',
    'Os POPs indexados da PMSC não trazem a resposta para a PERGUNTA abaixo.',
    'Responda com o procedimento padrão usual na doutrina policial brasileira e na legislação aplicável.',
    '',
    'Regras:',
    '1. Não diga que a resposta vem de um POP e não invente número de POP, seção ou página.',
    '2. Cite leis apenas quando tiver certeza (ex.: CTB, CPP, Súmula Vinculante 11).',
    '3. Use passos numerados curtos; no máximo 12 linhas, em português do Brasil, sem saudações.',
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

const SECOES_POP: [keyof Pick<Pop, 'sequencia' | 'atividadesCriticas' | 'errosEvitar' | 'material'>, string][] = [
  ['sequencia', 'SEQUÊNCIA DAS AÇÕES'],
  ['atividadesCriticas', 'ATIVIDADES CRÍTICAS'],
  ['errosEvitar', 'ERROS A SEREM EVITADOS'],
  ['material', 'MATERIAL NECESSÁRIO'],
];

/**
 * The sections of the best POPs as numbered sources for the model: whole
 * sections from the manual instead of excerpts cut at indexing time.
 * @param pops - Matching POPs, best first
 * @param quantos - How many POPs to use
 */
export function fontesDosPops(pops: Pop[], quantos = 2): FontePop[] {
  const fontes: FontePop[] = [];
  for (const pop of pops.slice(0, quantos)) {
    for (const [chave, secao] of SECOES_POP) {
      const texto = pop[chave].map((i) => i.texto).join('\n');
      if (!texto) continue;
      fontes.push({
        n: fontes.length + 1,
        documento_id: `pop-${pop.numero}`,
        titulo: `POP ${pop.numero} — ${pop.titulo}`,
        secao,
        pagina: pop.pagina,
        texto: texto.length > 3500 ? `${texto.slice(0, 3500)}…` : texto,
      });
    }
  }
  return fontes;
}
