// AI fallback for the Ficha de Fiscalização: when the base has nothing for a
// query, the provider chain drafts the sheet. It is always flagged as
// AI-written in the UI, so the agent confirms it against the MBFT.
import { z } from 'zod';

// Numbers ("pontuacao": 7) are kept as text; anything else unusable becomes null.
const texto = z
  .union([z.string(), z.number()])
  .transform((v) => String(v).trim().slice(0, 2000) || null)
  .nullable()
  .catch(null);

const esquemaFicha = z.object({
  tipificacaoResumida: texto,
  codigoEnquadramento: texto,
  amparoLegal: texto,
  tipificacao: texto,
  infrator: texto,
  competencia: texto,
  constatacao: texto,
  gravidade: texto,
  pontuacao: texto,
  penalidade: texto,
  medidaAdministrativa: texto,
  configuraCrime: texto,
  quandoAutuar: texto,
  quandoNaoAutuar: texto,
  definicoes: texto,
  exemplosObservacoes: z.array(z.string().trim().max(600)).max(10).catch([]),
  informacoesComplementares: texto,
});

export type FichaIA = z.infer<typeof esquemaFicha>;

/**
 * Prompt asking for the MBFT sheet as JSON, in the sheet's own order
 * @param consulta - Query, already PII-filtered
 * @returns Prompt text
 */
export function montarPromptFicha(consulta: string): string {
  return `Você é especialista no Código de Trânsito Brasileiro (Lei 9.503/97) e no Manual Brasileiro de Fiscalização de Trânsito (MBFT).
Um agente de trânsito consultou: "${consulta}"

Preencha a Ficha de Fiscalização do enquadramento que melhor corresponde. Responda SOMENTE com um objeto JSON com estas chaves (use null quando não souber com segurança; não invente códigos nem artigos):
{
  "tipificacaoResumida": "descrição curta da infração",
  "codigoEnquadramento": "código MBFT com desdobramento, ex. 516-91",
  "amparoLegal": "artigo do CTB, ex. art. 181, XVII",
  "tipificacao": "tipificação do enquadramento completa",
  "infrator": "Condutor, Proprietário, ...",
  "competencia": "órgão competente",
  "constatacao": "com ou sem abordagem",
  "gravidade": "Leve, Média, Grave ou Gravíssima",
  "pontuacao": "número de pontos",
  "penalidade": "ex. Multa",
  "medidaAdministrativa": "ou null",
  "configuraCrime": "SIM ou NÃO",
  "quandoAutuar": "itens numerados 1. 2. ...",
  "quandoNaoAutuar": "itens numerados 1. 2. ...",
  "definicoes": "definições e procedimentos",
  "exemplosObservacoes": ["exemplo 1 do campo de observações do AIT", "..."],
  "informacoesComplementares": "ou null"
}`;
}

/**
 * Read the model's answer into a sheet, tolerating prose around the JSON
 * @param resposta - Raw model output
 * @returns Parsed sheet, or null when there is no usable JSON
 */
export function interpretarFicha(resposta: string): FichaIA | null {
  const inicio = resposta.indexOf('{');
  const fim = resposta.lastIndexOf('}');
  if (inicio < 0 || fim <= inicio) return null;

  let bruto: unknown;
  try {
    bruto = JSON.parse(resposta.slice(inicio, fim + 1));
  } catch {
    return null;
  }

  const resultado = esquemaFicha.safeParse(bruto);
  if (!resultado.success) return null;

  const ficha = resultado.data;
  const temConteudo = Object.values(ficha).some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
  return temConteudo ? ficha : null;
}
