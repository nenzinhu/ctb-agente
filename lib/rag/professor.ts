// "Professor Emérito": a conversation grounded on what the app
// holds — CTB articles, MBFT sheets, registered case law and pending bills.
// Pure module: sources, prompt and citation cleanup; app/api/professor calls
// the retrieval and the models.
import type { FichaMbft } from '@/lib/mbft/parser';
import type { Jurisprudencia } from '@/lib/db/schema';
import type { ProjetoDeLei } from '@/lib/pdf/projetos-de-lei';
import type { FontePop } from '@/lib/rag/pop';

export type TipoFonte = 'ctb' | 'mbft' | 'pop' | 'jurisprudencia' | 'projeto';
export type ModoProfessor = 'auto' | 'ctb' | 'infracao' | 'pop' | 'simulador';

export interface OpcaoEsclarecimento {
  valor: string;
  titulo: string;
  descricao: string;
}

export interface ComparacaoInfracao {
  codigo: string;
  descricao: string;
  amparo: string;
  gravidade: string;
  pontos: string;
  penalidade: string;
  medida: string;
  quandoAutuar: string;
}

export interface FonteProfessor {
  n: number;
  tipo: TipoFonte;
  titulo: string;
  texto: string;
  link?: string;
}

export interface MensagemProfessor {
  papel: 'agente' | 'professor';
  texto: string;
}

const corte = (t: string, limite: number) => (t.length > limite ? `${t.slice(0, limite)}…` : t);

/**
 * Number every source the model may cite, in a fixed order by kind
 */
export function montarFontes(dados: {
  ctb: { numero_dispositivo: string; texto: string }[];
  fichas: FichaMbft[];
  pops: FontePop[];
  jurisprudencia: Jurisprudencia[];
  projetos: ProjetoDeLei[];
}): FonteProfessor[] {
  const fontes: Omit<FonteProfessor, 'n'>[] = [
    ...dados.ctb.map((d) => ({ tipo: 'ctb' as const, titulo: `CTB — ${d.numero_dispositivo}`, texto: corte(d.texto, 1500) })),
    ...dados.fichas.map((f) => ({
      tipo: 'mbft' as const,
      titulo: `MBFT ${f.codigo} — ${f.tipificacaoResumida}`,
      texto: corte(
        [
          `Amparo: ${f.amparoLegal} · Gravidade: ${f.gravidade} · Pontuação: ${f.pontuacao} · Penalidade: ${f.penalidade}`,
          `Medida administrativa: ${f.medidaAdministrativa} · Infrator: ${f.infrator} · Crime: ${f.configuraCrime}`,
          `Tipificação: ${f.tipificacao}`,
          `Quando autuar: ${f.quandoAutuar.join(' ')}`,
          `Quando não autuar: ${f.quandoNaoAutuar.join(' ')}`,
        ].join('\n'),
        1800
      ),
    })),
    ...dados.pops.map((p) => ({
      tipo: 'pop' as const,
      titulo: [p.titulo, p.secao, p.pagina ? `p. ${p.pagina}` : null].filter(Boolean).join(' · '),
      texto: corte(p.texto, 1800),
    })),
    ...dados.jurisprudencia.map((j) => ({
      tipo: 'jurisprudencia' as const,
      titulo: `${j.tipo.toUpperCase()} ${j.numero}${j.data_decisao ? ` (${j.data_decisao.slice(0, 10)})` : ''}`,
      texto: corte(j.resumo || j.ementa, 1200),
      link: j.link_oficial || undefined,
    })),
    ...dados.projetos.map((p) => ({
      tipo: 'projeto' as const,
      titulo: `${p.numero} — ${p.situacao}`,
      texto: corte(p.ementa, 800),
      link: p.link,
    })),
  ];
  return fontes.map((f, i) => ({ ...f, n: i + 1 }));
}

const ROTULO: Record<TipoFonte, string> = {
  ctb: 'LEI (CTB)',
  mbft: 'FICHA DO MBFT',
  pop: 'PROCEDIMENTO OPERACIONAL PADRÃO',
  jurisprudencia: 'JURISPRUDÊNCIA CADASTRADA',
  projeto: 'PROJETO DE LEI EM TRAMITAÇÃO',
};

/**
 * Prompt of one turn: persona, rules, numbered sources, recent history
 * @param pergunta - Current question, PII-filtered
 * @param historico - Previous turns, oldest first
 * @param fontes - Numbered sources
 */
export function promptProfessor(pergunta: string, historico: MensagemProfessor[], fontes: FonteProfessor[]): string {
  const blocoFontes = fontes.length
    ? fontes.map((f) => `[${f.n}] ${ROTULO[f.tipo]} · ${f.titulo}\n${f.texto}`).join('\n\n')
    : '(nenhuma fonte encontrada na base para esta pergunta)';
  const conversa = historico
    .slice(-6)
    .map((m) => `${m.papel === 'agente' ? 'ALUNO' : 'PROFESSOR'}: ${corte(m.texto, 800)}`)
    .join('\n');

  return [
    'Você é o Professor Emérito: especialista no Código de Trânsito Brasileiro (Lei 9.503/97), no MBFT, nos POPs da PMSC e na fiscalização de trânsito, e um ótimo didata.',
    'Responda à PERGUNTA do aluno usando as FONTES numeradas.',
    '',
    'Como responder:',
    '1. Comece pela resposta direta. Se for uma infração, diga qual é: código do MBFT, artigo, gravidade, pontos e penalidade.',
    '2. Explique para qualquer pessoa entender, com um exemplo concreto do dia a dia.',
    '3. Para uma dúvida operacional, indique o POP e resuma a sequência aplicável em passos curtos.',
    '4. Cite a fonte de cada afirmação com o número entre colchetes, ex.: [1] ou [2][3].',
    '5. Só fale de jurisprudência ou projetos de lei quando o aluno perguntar sobre isso. Mencione apenas os itens presentes nas FONTES.',
    '6. Alterações da lei: use as notas do próprio texto do CTB (ex.: "Redação dada pela Lei nº ..."). Se não houver nota, não afirme que houve alteração.',
    '7. Nunca misture uma ficha MBFT com um POP nem invente artigos, códigos, valores, decisões, procedimentos ou números de projeto.',
    '8. Se as fontes não bastarem, diga objetivamente qual informação falta.',
    '9. Português do Brasil, tom de professor paciente, no máximo 18 linhas, listas com "- " quando ajudar.',
    '',
    'FONTES:',
    blocoFontes,
    '',
    conversa ? `CONVERSA ATÉ AQUI:\n${conversa}\n` : '',
    `PERGUNTA: ${pergunta}`,
    '',
    'RESPOSTA DO PROFESSOR EMÉRITO:',
  ].join('\n');
}

/** Bills about traffic only: the Câmara search matches any ementa word */
export const sobreTransito = (ementa: string) =>
  /tr[âa]nsito|9\.503|\bCTB\b|ve[íi]culo|condutor|habilita[çc][ãa]o|motorista|rodovi/i.test(ementa);

const VAZIAS = new Set('que qual quais como onde quando para com sem por pela pelo uma uns dos das nos nas isso esse essa sobre tem ter existe houve alguma algum ainda artigo'.split(' '));

/** Keywords of a question, for the bill search */
export function palavrasChave(pergunta: string): string[] {
  return [
    ...new Set(
      pergunta
        .toLowerCase()
        .split(/[^a-zà-ú0-9]+/)
        .filter((p) => p.length >= 4 && !VAZIAS.has(p))
    ),
  ].slice(0, 6);
}
