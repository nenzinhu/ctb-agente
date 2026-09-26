// Study handouts ("apostilas") written by AI from the official texts: one
// chapter per MBFT sheet or POP. Pure module: prompts, the plain fallback
// when no model answers, and the conversion of the text into PDF blocks.
import type { FichaMbft } from '@/lib/mbft/parser';
import type { Pop } from '@/lib/pop/parser';
import type { BlocoEstilizado } from '@/lib/pdf-tools/pdf-writer';

export type Publico = 'agente' | 'leigo';
export type FonteApostila = 'mbft' | 'pop';

export interface ItemApostila {
  id: string;
  titulo: string;
}

export interface Capitulo extends ItemApostila {
  texto: string;
  /** "provider · model", or null for the plain official text */
  modelo: string | null;
}

const PUBLICO: Record<Publico, string> = {
  agente: 'agentes de trânsito e policiais em formação: linguagem técnica correta, mas clara e direta',
  leigo: 'pessoas leigas: linguagem do dia a dia, sem juridiquês, explicando todo termo técnico',
};

const FORMATO = [
  'Formato obrigatório:',
  '- Cada parte começa com uma linha "## Título da parte".',
  '- Parágrafos curtos; listas com "- " no início da linha.',
  '- Português do Brasil, sem saudações, sem introdução sobre você.',
  '- Use só as informações do texto oficial; não invente valores, prazos, artigos ou números.',
].join('\n');

export const tituloItem = (fonte: FonteApostila, item: FichaMbft | Pop) =>
  fonte === 'mbft'
    ? `${(item as FichaMbft).codigo} — ${(item as FichaMbft).tipificacaoResumida}`
    : `POP ${(item as Pop).numero} — ${(item as Pop).titulo}`;

const lista = (itens: { texto: string }[] | string[], limite = 2500) => {
  const texto = itens.map((i) => (typeof i === 'string' ? i : i.texto)).join('\n');
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
};

/** The official text a chapter is written from */
export function textoOficial(fonte: FonteApostila, item: FichaMbft | Pop): string {
  if (fonte === 'mbft') {
    const f = item as FichaMbft;
    return [
      `Código: ${f.codigo} · Amparo legal: ${f.amparoLegal}`,
      `Tipificação: ${f.tipificacao}`,
      `Gravidade: ${f.gravidade} · Pontuação: ${f.pontuacao} · Penalidade: ${f.penalidade}`,
      `Medida administrativa: ${f.medidaAdministrativa} · Pode configurar crime: ${f.configuraCrime}`,
      `Infrator: ${f.infrator} · Competência: ${f.competencia} · Constatação: ${f.constatacao}`,
      `Quando autuar:\n${lista(f.quandoAutuar)}`,
      `Quando não autuar:\n${lista(f.quandoNaoAutuar)}`,
      `Definições e procedimentos:\n${lista(f.definicoes, 1500)}`,
      `Exemplos de observações do AIT:\n${lista(f.exemplos, 800)}`,
    ].join('\n');
  }
  const p = item as Pop;
  return [
    `Execução: ${p.execucao}`,
    `Material necessário:\n${lista(p.material, 600)}`,
    `Sequência das ações:\n${lista(p.sequencia)}`,
    `Atividades críticas:\n${lista(p.atividadesCriticas, 1200)}`,
    `Erros a serem evitados:\n${lista(p.errosEvitar, 1200)}`,
  ].join('\n');
}

/**
 * Prompt for one chapter of the handout
 * @param fonte - MBFT sheet or POP
 * @param item - The official item
 * @param publico - Who the handout is for
 */
export function promptCapitulo(fonte: FonteApostila, item: FichaMbft | Pop, publico: Publico): string {
  const partes =
    fonte === 'mbft'
      ? [
          '## Objetivos de aprendizagem (3 itens)',
          '## Entendendo a infração (o que é e por que existe)',
          '## Como identificar e autuar (passo a passo, incluindo quando NÃO autuar)',
          '## Exemplos práticos do dia a dia (3 casos concretos)',
          '## Consequências (gravidade, pontos, penalidade e medida administrativa)',
          '## Erros comuns na autuação',
          '## Questões de fixação (3 questões de múltipla escolha, alternativas a) a d))',
          '## Gabarito comentado',
        ]
      : [
          '## Objetivos de aprendizagem (3 itens)',
          '## Para que serve o procedimento',
          '## Passo a passo (resumo fiel da sequência das ações)',
          '## Exemplos práticos (2 ou 3 situações concretas)',
          '## Atividades críticas e erros a evitar',
          '## Questões de fixação (3 questões de múltipla escolha, alternativas a) a d))',
          '## Gabarito comentado',
        ];
  return [
    `Você é instrutor e escreve um capítulo de apostila de estudo para ${PUBLICO[publico]}.`,
    `Tema do capítulo: ${tituloItem(fonte, item)}.`,
    'O capítulo deve ter estas partes, nesta ordem:',
    ...partes,
    '',
    FORMATO,
    '',
    `TEXTO OFICIAL (${fonte === 'mbft' ? 'MBFT' : 'Manual de POP PMSC'}):`,
    textoOficial(fonte, item),
    '',
    'CAPÍTULO:',
  ].join('\n');
}

/** When no model answers, the chapter still carries the official text */
export function capituloSemIA(fonte: FonteApostila, item: FichaMbft | Pop): string {
  return `## Texto oficial\n${textoOficial(fonte, item)
    .split('\n')
    .map((l) => (/^\d+\.|^[a-z]\./.test(l) ? `- ${l}` : l))
    .join('\n')}`;
}

const limparMarcacao = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/^#+\s*/, '').trim();

/**
 * The handout as PDF blocks: chapter titles, part headings, paragraphs, items
 * @param capitulos - Chapters in order
 */
export function blocosDaApostila(capitulos: Capitulo[]): BlocoEstilizado[] {
  const blocos: BlocoEstilizado[] = [];
  capitulos.forEach((capitulo, i) => {
    blocos.push({ texto: `Capítulo ${i + 1} — ${capitulo.titulo}`, estilo: 'titulo' });
    for (const bruta of capitulo.texto.split('\n')) {
      const linha = bruta.trim();
      if (!linha) continue;
      if (/^#{1,6}\s/.test(linha) || /^\*\*[^*]+\*\*:?$/.test(linha)) {
        blocos.push({ texto: limparMarcacao(linha).replace(/:$/, ''), estilo: 'subtitulo' });
      } else if (/^[-*•]\s/.test(linha)) {
        blocos.push({ texto: `• ${limparMarcacao(linha.replace(/^[-*•]\s/, ''))}`, estilo: 'item' });
      } else if (/^(\d+[.)]|[a-d]\))\s/.test(linha)) {
        blocos.push({ texto: limparMarcacao(linha), estilo: 'item' });
      } else {
        blocos.push({ texto: limparMarcacao(linha), estilo: 'paragrafo' });
      }
    }
    blocos.push({
      texto: capitulo.modelo
        ? `Texto didático gerado por IA (${capitulo.modelo}) a partir do texto oficial. Não substitui a norma.`
        : 'Texto oficial, sem adaptação (nenhum modelo de IA respondeu).',
      estilo: 'nota',
    });
  });
  return blocos;
}
