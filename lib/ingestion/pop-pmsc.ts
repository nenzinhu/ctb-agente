// The PMSC's compiled POP manual ("Manual de POP PMSC Compilado"). Every
// page repeats the POP's header box (title, number, dates, who executes it)
// and every page ends with the digital-signature notice. Left as they are,
// excerpts are labelled "PROCEDIMENTO OPERACIONAL PADRÃO — …" with no POP
// number, and the notices land in search results. This turns the first
// header of each POP into one heading the chunker nests the sections under
// ("POP 002 — BUSCA PESSOAL (TÉCNICA POLICIAL) › SEQUÊNCIA DAS AÇÕES"),
// drops the repeated headers and the boilerplate, and leaves any other
// document untouched.
import { PAGE_MARKER_RE, joinWrappedLine } from './pdf-text';

const CABECALHO_RE = /^PROCEDIMENTO OPERACIONAL PADR[ÃA]O(?:\s+DE)?$/i;
const ESTABELECIDO_RE = /Estabelecido\s+em/i;
// How many filled lines the title block (title, "POP", number) may take,
// and how far below "Estabelecido em" the rest of the header box goes.
const MAX_LINHAS_TITULO = 10;
const MAX_LINHAS_CAIXA = 14;

// The header box's dates and executor: "23/12/2011", "-", "Atualizado em",
// "Execução" and its value ("Guarnição PM", "Guarnição de / Operações / Aéreas").
const DATA_RE = /^(?:\d{2}\/\d{2}\/\d{4}|-)$/;
const ATUALIZADO_RE = /^Atualizado\s+em\b/i;
const EXECUCAO_RE = /^Execu[çc][ãa]o\b/i;
const EXECUCAO_EXTRA_RE = /^\p{L}[\p{L}\s-]{0,29}$/u;
const MAX_LINHAS_EXECUCAO = 3;
// "POP", "POP nº", "POP 008"; the number may come on the next line.
const POP_NUMERO_RE = /^POP(?:\s*n[º°o]\.?)?(?:\s*(\d+(?:\.\d+)*))?$/i;
const NUMERO_RE = /^\d+(?:\.\d+)*$/;
const POP_NO_FIM_RE = /\bPOP(?:\s*n[º°o]\.?)?$/i;

// The POP's own sections: always headings, even right after a line.
export const SECAO_POP_RE =
  /^(?:MATERIAL NECESS[ÁA]RIO|FUNDAMENTA[ÇC][ÃA]O LEGAL(?: E DOUTRIN[ÁA]RIA)?|SEQU[ÊE]NCIA DAS A[ÇC][ÕO]ES|ATIVIDADES CR[ÍI]TICAS|ERROS A SEREM EVITADOS|RESULTADOS ESPERADOS|A[ÇC][ÕO]ES CORRETIVAS)$/i;

// The same notices glued to the end of a content line by the extraction.
const RUIDO_NO_FIM_RE = /\s*(?:Para verificar a autenticidade desta c[óo]pia|O original deste documento [ée] eletr[ôo]nico).*$/i;
const RODAPE_MANUAL_RE = /\s*Manual de POP PMSC Compilado gerado em \d{2}\/\d{2}\/\d{4}(?:\s+\d{2}:\d{2})?/gi;

// Repeated on every page, saying nothing about the procedure.
const RUIDO_RE = [
  /^Para verificar a autenticidade desta c[óo]pia/i,
  /^O original deste documento [ée] eletr[ôo]nico/i,
  /^Manual de POP PMSC Compilado gerado em/i,
  /^LEGISLA[ÇC][ÃA]O\s*\/\s*DOUTRINA(?:\s+ESPECIFICA[ÇC][ÃA]O)?$/i,
  /^ESPECIFICA[ÇC][ÃA]O$/i,
];

interface Cabecalho {
  titulo: string;
  numero?: string;
  /** Index of the first line after the header box. */
  fim: number;
}

/**
 * Whether the text is the compiled POP manual (or a POP in its format).
 */
export function ehManualPop(texto: string): boolean {
  return /^PROCEDIMENTO OPERACIONAL PADR[ÃA]O$/im.test(texto) && ESTABELECIDO_RE.test(texto);
}

/**
 * Whether a header box repeats the POP already open: the same number, or,
 * when a page leaves the number out, the same title — possibly cut shorter
 * ("… NOS ESTÁDIOS E ARENAS" for "… NOS ESTÁDIOS E ARENAS DESPORTIVAS").
 */
function mesmoPop(atual: { chave: string; numero?: string } | null, chave: string, numero?: string): boolean {
  if (!atual) return false;
  if (atual.numero && numero) return atual.numero === numero;
  if (atual.chave === chave) return true;
  const [curta, longa] = atual.chave.length <= chave.length ? [atual.chave, chave] : [chave, atual.chave];
  return curta.length >= 15 && longa.startsWith(curta);
}

/** Letters and digits only: the same POP wrapped differently on another page. */
function chaveDoTitulo(titulo: string): string {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Reads the header box that starts at `inicio` ("PROCEDIMENTO OPERACIONAL PADRÃO").
 * The box comes in a few layouts: the number after the title ("… POP" /
 * "002"), glued to the next label ("101.6.5Estabelecido em"), or at the
 * end, after a multi-line executor ("Execução / Guarnição PM e / Seção
 * Técnica OPM / POP / 201.14.1").
 * @returns null when the lines below are not a header box
 */
function lerCabecalho(linhas: string[], inicio: number): Cabecalho | null {
  const partes: string[] = [];
  let numero: string | undefined;
  let esperaNumero = false;
  let tituloFechado = false;
  let i = inicio + 1;
  let achou = false;

  const lerPop = (linha: string): boolean => {
    if (esperaNumero && NUMERO_RE.test(linha)) {
      numero ??= linha;
      esperaNumero = false;
      return true;
    }
    const pop = POP_NUMERO_RE.exec(linha);
    if (!pop) return false;
    if (pop[1]) numero ??= pop[1];
    esperaNumero = !pop[1];
    return true;
  };

  let preenchidas = 0;
  for (; i < linhas.length && preenchidas < MAX_LINHAS_TITULO; i++) {
    const linha = linhas[i].trim();
    if (!linha) {
      // The title is one block; a blank line ends it.
      if (partes.length > 0) tituloFechado = true;
      continue;
    }
    if (PAGE_MARKER_RE.test(linha)) return null;
    preenchidas++;
    const posicao = linha.search(ESTABELECIDO_RE);
    // "101.6.5Estabelecido em": the number is glued to the label.
    const antes = (posicao >= 0 ? linha.slice(0, posicao) : linha).trim();
    if (antes) {
      // After the title only the number is worth keeping ("POP" / "008").
      if (tituloFechado) lerPop(antes);
      else partes.push(antes);
      // "… PROTETOR AMBIENTAL" / "POP" / "" / "102.10.1": the number may come after a gap.
      if (!tituloFechado && POP_NO_FIM_RE.test(antes)) esperaNumero = true;
    }
    if (posicao >= 0) {
      achou = true;
      break;
    }
  }
  if (!achou) return null;

  const bruto = partes.reduce((texto, parte) => (texto ? joinWrappedLine(texto, parte) : parte), '');
  // "... (TÉCNICA POLICIAL) POP 002", "... EM OCORRÊNCIAS POP nº 009", "... POP nº 104.8.1"
  const partido = /^(.*?)\s*\bPOP\b(?:\s*n[º°o]\.?)?\s*(\d+(?:\.\d+)*)?\s*$/i.exec(bruto);
  const titulo = (partido ? partido[1] : bruto).replace(/[\s–—.-]+$/, '').replace(/\s+/g, ' ').trim();
  if (!titulo) return null;
  numero ??= partido?.[2];
  if (partido && !partido[2]) esperaNumero = true;

  // The rest of the box: dates, executor and, in some layouts, the number.
  let fim = i + 1;
  let fase: 'datas' | 'execucao' | 'pop' = 'datas';
  let linhasExecucao = 0;
  while (fim < linhas.length && fim <= i + MAX_LINHAS_CAIXA) {
    const linha = linhas[fim].trim();
    if (!linha) {
      fim++;
      continue;
    }
    if (PAGE_MARKER_RE.test(linha) || SECAO_POP_RE.test(linha)) break;
    if (lerPop(linha)) {
      fase = 'pop';
      fim++;
      continue;
    }
    // "Estabelecido em" again: the source's typo for "Atualizado em".
    if (fase === 'datas' && (DATA_RE.test(linha) || ATUALIZADO_RE.test(linha) || /^Estabelecido\s+em\b/i.test(linha))) {
      // "Atualizado em Execução": both labels on one line, the executor next.
      if (/Execu[çc][ãa]o$/i.test(linha)) fase = 'execucao';
      fim++;
      continue;
    }
    if (fase === 'datas' && EXECUCAO_RE.test(linha)) {
      fase = linha.replace(EXECUCAO_RE, '').trim() ? 'pop' : 'execucao';
      fim++;
      continue;
    }
    // The executor's value, which may wrap over a few short lines.
    if (fase === 'execucao' && (linhasExecucao === 0 || (linhasExecucao < MAX_LINHAS_EXECUCAO && EXECUCAO_EXTRA_RE.test(linha)))) {
      linhasExecucao++;
      fim++;
      continue;
    }
    break;
  }

  return { titulo, numero, fim };
}

/**
 * @param texto - Extracted text of the manual (may carry page markers)
 * @returns The text with one "POP nnn — TÍTULO" heading per POP and without
 *   the repeated header boxes and signature notices; other texts unchanged
 */
export function normalizarManualPop(texto: string): string {
  if (!ehManualPop(texto)) return texto;

  const linhas = texto.split('\n').map((linha) => linha.replace(RODAPE_MANUAL_RE, '').replace(RUIDO_NO_FIM_RE, ''));
  const saida: string[] = [];
  let atual: { chave: string; numero?: string } | null = null;

  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim();

    if (PAGE_MARKER_RE.test(linha)) {
      saida.push(linha);
      continue;
    }
    if (RUIDO_RE.some((re) => re.test(linha))) continue;

    if (CABECALHO_RE.test(linha)) {
      const cabecalho = lerCabecalho(linhas, i);
      if (cabecalho) {
        const chave = chaveDoTitulo(cabecalho.titulo);
        if (mesmoPop(atual, chave, cabecalho.numero)) {
          // A later page may be the first to show the number.
          if (atual && !atual.numero && cabecalho.numero) atual.numero = cabecalho.numero;
        } else {
          atual = { chave, numero: cabecalho.numero };
          const numero = cabecalho.numero ? ` ${cabecalho.numero}` : '';
          saida.push('', `POP${numero} — ${cabecalho.titulo}`, '');
        }
        i = cabecalho.fim - 1;
      }
      // An unreadable box still loses its label line: it would open a heading.
      continue;
    }

    // The manual's cover and index come before the first POP.
    if (atual === null) continue;
    saida.push(linhas[i]);
  }

  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
