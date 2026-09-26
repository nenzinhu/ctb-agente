// Reads the "Manual de POP PMSC Compilado" into structured procedures. Pure
// module: the input is each page as positioned lines (see lib/mbft/parser.ts),
// produced by scripts/importar-pops.ts with pdf.js. Every POP has the same
// form: a header (title, number, dates, execução) and fixed sections.
import type { Linha, Pagina } from '../mbft/parser';

export interface ItemPop {
  texto: string;
  /** Indentation level: 0 for "1.", 1 for "a.", 2 for "I.", 3 for "i." */
  nivel: number;
}

export interface NormaPop {
  norma: string;
  especificacao: string;
}

export interface Pop {
  /** "002", "102.8.1" */
  numero: string;
  titulo: string;
  estabelecido: string;
  atualizado: string;
  execucao: string;
  material: ItemPop[];
  fundamentacao: NormaPop[];
  sequencia: ItemPop[];
  atividadesCriticas: ItemPop[];
  errosEvitar: ItemPop[];
  /** Annexes and any section beyond the standard ones */
  anexos: ItemPop[];
  /** First PDF page of the POP */
  pagina: number;
}

type Secao = 'material' | 'fundamentacao' | 'sequencia' | 'atividadesCriticas' | 'errosEvitar' | 'anexos';

const SECOES: Record<string, Secao> = {
  'MATERIAL NECESSÁRIO': 'material',
  'FUNDAMENTAÇÃO LEGAL E DOUTRINÁRIA': 'fundamentacao',
  'SEQUÊNCIA DAS AÇÕES': 'sequencia',
  'ATIVIDADES CRÍTICAS': 'atividadesCriticas',
  'ERROS A SEREM EVITADOS': 'errosEvitar',
};

const texto = (l: Linha) => l.map((f) => f.texto).join(' ').replace(/\s+/g, ' ').trim();

/** Page furniture: generation stamp, digital signature notice, page number */
function ehRodape(l: Linha): boolean {
  const t = texto(l);
  return (
    /^Manual de POP PMSC Compilado gerado em/.test(t) ||
    /^O original deste documento é eletrônico/.test(t) ||
    // The page number sits at the far right; a lone "001" further left is a POP number
    (/^\d{1,3}$/.test(t) && l[0].x > 540)
  );
}

const MARCADOR = /^(\d+\.|[a-z]\.|[IVXL]+\.|[ivxl]+\.|[a-z]\)|-|•)\s/;

/** Level by the x where the item starts (57, 85, 114, 142 in the manual) */
function nivel(x: number): number {
  if (x < 75) return 0;
  if (x < 100) return 1;
  if (x < 130) return 2;
  return 3;
}

function acrescentar(itens: ItemPop[], linha: Linha): void {
  const t = texto(linha);
  if (!t) return;
  const ultimo = itens[itens.length - 1];
  if (!ultimo || MARCADOR.test(t)) {
    itens.push({ texto: t, nivel: nivel(linha[0].x) });
  } else {
    ultimo.texto = /-$/.test(ultimo.texto) ? ultimo.texto.slice(0, -1) + t : `${ultimo.texto} ${t}`;
  }
}

interface Cabecalho {
  numero: string;
  titulo: string;
  estabelecido: string;
  atualizado: string;
  execucao: string;
  /** Index of the first body line */
  fim: number;
}

const DATA = /^\d{2}\/\d{2}\/\d{4}$|^-$/;
const ROTULO = /^(POP|POP nº|nº|Execução|Estabelecido em|Atualizado em)$/;
const NUMERO = /^\d{3}(\.\d+)*$/;

/**
 * The header of a page: everything from "PROCEDIMENTO OPERACIONAL PADRÃO"
 * to the first section title. Its lines come in different orders across the
 * manual, so fields are told apart by position and shape, not by line.
 */
function lerCabecalho(linhas: Linha[]): Cabecalho | null {
  if (texto(linhas[0] ?? []) !== 'PROCEDIMENTO OPERACIONAL PADRÃO') return null;
  const fim = linhas.findIndex((l, i) => i > 0 && (SECOES[texto(l)] !== undefined || /^OBJETIVO$/.test(texto(l))));
  const bloco = linhas.slice(1, fim > 0 && fim < 20 ? fim : Math.min(linhas.length, 10));
  const fragmentos = bloco.flat();

  const rotulos = bloco.find((l) => l.some((f) => /^Estabelecido em/.test(f.texto)));
  const xAtualizado = rotulos?.find((f) => /^Atualizado/.test(f.texto))?.x ?? 250;
  const xExecucao = fragmentos.find((f) => /^Execução$/.test(f.texto.trim()))?.x ?? 360;
  const yRotulos = rotulos ? bloco.indexOf(rotulos) : -1;
  const iNumero = bloco.findIndex((l) => l.some((f) => NUMERO.test(f.texto.trim()) && f.x > 440));

  const numero = fragmentos.find((f) => NUMERO.test(f.texto.trim()) && f.x > 440)?.texto.trim() ?? '';
  const datas = fragmentos.filter((f) => DATA.test(f.texto.trim()));
  const estabelecido = datas.find((f) => f.x < xAtualizado - 10)?.texto.trim() ?? '';
  const atualizado = datas.find((f) => f.x >= xAtualizado - 10 && f.x < xExecucao - 30)?.texto.trim() ?? '';

  // Title: the text above the date labels, left of the number column
  const titulo = bloco
    .slice(0, yRotulos > 0 ? yRotulos : iNumero + 1)
    .flat()
    .filter((f) => f.x < 470 && !ROTULO.test(f.texto.trim()) && !DATA.test(f.texto.trim()))
    .map((f) => f.texto)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Execução: what sits in its column below the labels, possibly over two lines
  const execucao = bloco
    .slice(Math.max(yRotulos, 0))
    .flat()
    .filter((f) => f.x >= xExecucao - 40 && f.x < 470 && !ROTULO.test(f.texto.trim()) && !DATA.test(f.texto.trim()))
    .map((f) => f.texto)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

  return { numero, titulo, estabelecido, atualizado: atualizado === '-' ? '' : atualizado, execucao, fim: 1 + bloco.length };
}

/**
 * Every POP in the manual, in page order. A POP's header repeats on each of
 * its pages; a new number starts a new POP.
 */
export function lerPops(paginas: Pagina[]): Pop[] {
  const pops: Pop[] = [];
  let atual: Pop | null = null;
  let secao: Secao | null = null;

  for (const pagina of paginas) {
    let linhas = pagina.linhas.filter((l) => !ehRodape(l));
    const cabecalho = lerCabecalho(linhas);

    if (cabecalho?.numero) {
      if (!atual || atual.numero !== cabecalho.numero) {
        atual = {
          numero: cabecalho.numero,
          titulo: cabecalho.titulo,
          estabelecido: cabecalho.estabelecido,
          atualizado: cabecalho.atualizado,
          execucao: cabecalho.execucao,
          material: [],
          fundamentacao: [],
          sequencia: [],
          atividadesCriticas: [],
          errosEvitar: [],
          anexos: [],
          pagina: pagina.numero,
        };
        pops.push(atual);
        secao = null;
      }
      linhas = linhas.slice(cabecalho.fim);
    }
    if (!atual) continue;

    for (const linha of linhas) {
      const t = texto(linha);
      const nova = SECOES[t];
      if (nova) {
        secao = nova;
        continue;
      }
      if (/^ANEXO\b/.test(t)) secao = 'anexos';
      if (!secao) continue;

      if (secao === 'fundamentacao') {
        if (/^LEGISLAÇÃO\/DOUTRINA/.test(t)) continue;
        // Two-column table: the norm on the left, the part cited on the right
        const norma = linha.filter((f) => f.x < 290).map((f) => f.texto).join(' ').trim();
        const especificacao = linha.filter((f) => f.x >= 290).map((f) => f.texto).join(' ').trim();
        const ultima = atual.fundamentacao[atual.fundamentacao.length - 1];
        if (ultima && (!norma || !especificacao) && /[^.;]$/.test(ultima.norma + ultima.especificacao) && !/^\d/.test(t)) {
          if (norma) ultima.norma = `${ultima.norma} ${norma}`.trim();
          if (especificacao) ultima.especificacao = `${ultima.especificacao} ${especificacao}`.trim();
        } else {
          atual.fundamentacao.push({ norma, especificacao });
        }
        continue;
      }

      acrescentar(atual[secao], linha);
    }
  }

  return pops;
}
