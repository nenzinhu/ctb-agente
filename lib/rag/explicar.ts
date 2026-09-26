// Plain-language explanations of an MBFT sheet or a POP, for someone with no
// background: what it means, why it exists and everyday examples. Pure module:
// prompts only; app/api/explicar calls the models.
import type { FichaMbft } from '@/lib/mbft/parser';
import type { Pop } from '@/lib/pop/parser';

const REGRAS = [
  'Regras:',
  '1. Escreva para uma pessoa leiga: frases curtas, sem juridiquês; explique qualquer termo técnico na primeira vez que aparecer.',
  '2. Use só as informações do texto oficial abaixo; não invente valores, prazos, artigos ou números.',
  '3. Português do Brasil, sem saudações, no máximo 25 linhas.',
  '4. Formato: parágrafos curtos e listas com "- "; use **negrito** só nos títulos das partes.',
].join('\n');

/**
 * @param ficha - Official MBFT sheet
 * @returns Prompt asking for a lay explanation with everyday examples
 */
export function promptExplicarFicha(ficha: FichaMbft): string {
  return [
    'Você explica infrações de trânsito para cidadãos comuns.',
    'Explique a infração abaixo em quatro partes:',
    '**O que é** — em uma ou duas frases simples.',
    '**Por que existe** — o risco ou o problema que a regra evita.',
    '**Exemplos do dia a dia** — 3 situações concretas e cotidianas em que alguém comete essa infração, e 1 situação parecida em que NÃO comete (use os critérios de "quando autuar" e "quando não autuar").',
    '**O que acontece** — gravidade, pontos, multa e medida administrativa explicados de forma simples.',
    '',
    REGRAS,
    '',
    'TEXTO OFICIAL (MBFT):',
    `Código: ${ficha.codigo} · Amparo: ${ficha.amparoLegal}`,
    `Infração: ${ficha.tipificacao}`,
    `Gravidade: ${ficha.gravidade} · Pontuação: ${ficha.pontuacao} · Penalidade: ${ficha.penalidade}`,
    `Medida administrativa: ${ficha.medidaAdministrativa} · Pode configurar crime: ${ficha.configuraCrime}`,
    `Quem responde: ${ficha.infrator}`,
    `Quando autuar: ${ficha.quandoAutuar.join(' ')}`,
    `Quando não autuar: ${ficha.quandoNaoAutuar.join(' ')}`,
    '',
    'EXPLICAÇÃO:',
  ].join('\n');
}

const trecho = (itens: { texto: string }[], limite = 2500) => {
  const texto = itens.map((i) => i.texto).join('\n');
  return texto.length > limite ? `${texto.slice(0, limite)}…` : texto;
};

/**
 * @param pop - Official POP
 * @returns Prompt asking for a lay explanation with everyday examples
 */
export function promptExplicarPop(pop: Pop): string {
  return [
    'Você explica procedimentos da Polícia Militar para cidadãos comuns.',
    'Explique o procedimento abaixo em quatro partes:',
    '**Para que serve** — em uma ou duas frases simples.',
    '**Como funciona, passo a passo** — os passos principais, na ordem, em linguagem do dia a dia.',
    '**Exemplos do dia a dia** — 2 ou 3 situações concretas e cotidianas em que esse procedimento é usado, contadas do ponto de vista de quem presencia.',
    '**Cuidados importantes** — os pontos críticos e os erros a evitar, explicados de forma simples.',
    '',
    REGRAS,
    '',
    `TEXTO OFICIAL (POP ${pop.numero} — ${pop.titulo}):`,
    `Sequência das ações:\n${trecho(pop.sequencia)}`,
    `Atividades críticas:\n${trecho(pop.atividadesCriticas, 1200)}`,
    `Erros a serem evitados:\n${trecho(pop.errosEvitar, 1200)}`,
    '',
    'EXPLICAÇÃO:',
  ].join('\n');
}
