// Reads the "FICHA DE FISCALIZAÇÃO" pages of the MBFT (Manual Brasileiro de
// Fiscalização de Trânsito, Volume I) into structured sheets. Pure module: the
// input is the text of each page as positioned lines (x of every fragment),
// produced by scripts/importar-mbft.ts with pdf.js. Every sheet has the same
// fixed layout, so fields are found by label and columns by x position.

export interface FichaMbft {
  /** "751-01": code and desdobramento, as printed */
  codigo: string;
  tipificacaoResumida: string;
  amparoLegal: string;
  tipificacao: string;
  gravidade: string;
  penalidade: string;
  medidaAdministrativa: string;
  configuraCrime: string;
  infrator: string;
  competencia: string;
  pontuacao: string;
  constatacao: string;
  quandoAutuar: string[];
  quandoNaoAutuar: string[];
  definicoes: string[];
  exemplos: string[];
  informacoesComplementares: string[];
  /** First PDF page of the sheet */
  pagina: number;
  /** Laws that changed the cited article, from the compiled CTB (added at load) */
  historicoLei?: string[];
}

export interface Fragmento {
  x: number;
  texto: string;
}

export type Linha = Fragmento[];

export interface Pagina {
  numero: number;
  linhas: Linha[];
}

/**
 * Left edges of the 4-column rows. Usually 41, 172, 303 and 438, but some
 * pages are shifted, so each sheet measures them on its "Gravidade" row.
 */
const CORTES_PADRAO = [160, 295, 430];

function coluna(x: number, cortes: number[] = CORTES_PADRAO): number {
  return cortes.filter((c) => x >= c).length;
}

const texto = (l: Linha) => l.map((f) => f.texto).join(' ').replace(/\s+/g, ' ').trim();

/** Page furniture repeated on every page */
function ehCabecalho(l: Linha): boolean {
  const t = texto(l);
  return (
    t === 'CONSELHO NACIONAL DE TRÂNSITO' ||
    /^MANUAL BRASILEIRO DE FISCALIZAÇÃO DE TRÂNSITO/.test(t) ||
    /^\d{1,3}$/.test(t)
  );
}

/** Join wrapped lines of one column; numbered items start a new entry. */
function juntar(pedacos: string[]): string[] {
  const itens: string[] = [];
  for (const pedaco of pedacos) {
    const p = pedaco.trim();
    if (!p) continue;
    const ultimo = itens[itens.length - 1];
    if (ultimo === undefined || /^\d+\s?\.\s/.test(p)) {
      itens.push(p);
    } else if (/-$/.test(ultimo) && /^\d/.test(p)) {
      // "752-" + "81": a code split by the column width
      itens[itens.length - 1] = ultimo + p;
    } else {
      itens[itens.length - 1] = `${ultimo} ${p}`;
    }
  }
  return itens.map((i) => i.replace(/^(\d+)\s\./, '$1.'));
}

const unir = (pedacos: string[]) => juntar(pedacos).join(' ').replace(/\s+/g, ' ').trim();

/** Split the lines into columns by the x of each fragment */
function porColuna(linhas: Linha[], total: number, cortes: number[]): string[][] {
  const colunas: string[][] = Array.from({ length: total }, () => []);
  for (const linha of linhas) {
    const naLinha: string[][] = Array.from({ length: total }, () => []);
    for (const f of linha) naLinha[Math.min(coluna(f.x, cortes), total - 1)].push(f.texto);
    naLinha.forEach((partes, i) => partes.length && colunas[i].push(partes.join(' ')));
  }
  return colunas;
}

const inicia = (l: Linha, prefixo: RegExp) => prefixo.test(texto(l));

/**
 * Parse one sheet from its lines (header already found, page furniture removed)
 */
function lerFicha(linhas: Linha[], pagina: number): FichaMbft | null {
  const achar = (re: RegExp, desde = 0) => linhas.findIndex((l, i) => i >= desde && inicia(l, re));

  const iResumida = achar(/^Tipificação Resumida/);
  const iAmparo = achar(/^Amparo Legal/);
  const iTipificacao = achar(/^Tipificação do Enquadramento/);
  const iGravidade = achar(/^Gravidade/);
  const iInfrator = achar(/^Infrator/);
  const iPontuacao = achar(/^Pontuação/);
  const iColunas = achar(/^(Exemplos do Campo|Quando AUTUAR)/i, Math.max(iPontuacao, 0));
  if ([iResumida, iAmparo, iTipificacao, iGravidade, iInfrator, iPontuacao].some((i) => i < 0)) return null;

  const rotulos = linhas[iGravidade];
  const borda = (re: RegExp) => rotulos.find((f) => re.test(f.texto))?.x;
  const medidos = [borda(/^Penalidade/), borda(/^Medida/), borda(/^Pode/)];
  const cortes = medidos.every((x) => x !== undefined) ? medidos.map((x) => (x as number) - 6) : CORTES_PADRAO;

  // Code and short description share the line below the labels
  const linhaResumo = linhas.slice(iResumida + 1, iAmparo).flat();
  const codigo = linhaResumo.map((f) => f.texto).join(' ').match(/\b(\d{3}\s?-\s?\d{2})\b/)?.[1]?.replace(/\s/g, '') ?? '';
  const tipificacaoResumida = unir(
    linhas.slice(iResumida + 1, iAmparo).map((l) => texto(l.filter((f) => f.x < cortes[2])))
  );

  const amparoLegal = unir(linhas.slice(iAmparo + 1, iTipificacao).map(texto));
  const tipificacao = unir(linhas.slice(iTipificacao + 1, iGravidade).map(texto));

  // Gravidade | Penalidade | Medida | Crime; the crime answer may sit on the Infrator rows
  const [grav, pen, medida] = porColuna(linhas.slice(iGravidade + 1, iInfrator), 4, cortes);
  const [infr, comp] = porColuna(linhas.slice(iInfrator + 1, iPontuacao), 4, cortes);
  // The crime column's answer lands on any row, the label rows included
  const crime = linhas
    .slice(iGravidade, iPontuacao)
    .flatMap((l) => l.filter((f) => coluna(f.x, cortes) === 3).map((f) => f.texto))
    .filter((t) => !/^(Pode|Configurar|Crime|de|Trânsito:?|Infração|Penal:?)$|^(Pode Configurar|Crime de|Infração Penal)/i.test(t.trim()));
  const fimPontuacao = iColunas > 0 ? iColunas : linhas.length;
  const [pont, const1] = porColuna(linhas.slice(iPontuacao + 1, fimPontuacao), 2, cortes);

  // Four columns until "Informações Complementares"
  const iInfo = achar(/^Informações Complementares/, Math.max(iColunas, 0));
  const blocoColunas = iColunas > 0 ? linhas.slice(iColunas, iInfo > 0 ? iInfo : undefined) : [];
  const semRotulos = blocoColunas.filter(
    (l) => !inicia(l, /^(Exemplos do Campo|Quando AUTUAR|Observações do AIT)/i)
  );
  const [autuar, naoAutuar, definicoes, exemplos] = porColuna(semRotulos, 4, cortes);
  const info = iInfo > 0 ? juntar(linhas.slice(iInfo + 1).map(texto)) : [];

  return {
    codigo,
    tipificacaoResumida,
    amparoLegal,
    tipificacao,
    gravidade: unir(grav),
    penalidade: unir(pen),
    medidaAdministrativa: unir(medida),
    configuraCrime: unir(crime).replace(/^(?:Pode\s+)?(?:Configurar\s+)?(?:Crime\s+de\s*|Infração\s+Penal:?\s*)?(?:Trânsito:?\s*)?/i, ''),
    infrator: unir(infr),
    competencia: unir(comp),
    pontuacao: unir(pont).replace(/^:\s*/, ''),
    constatacao: unir(const1),
    quandoAutuar: juntar(autuar),
    quandoNaoAutuar: juntar(naoAutuar),
    definicoes: juntar(definicoes),
    exemplos: juntar(exemplos),
    informacoesComplementares: info,
    pagina,
  };
}

/**
 * Every sheet in the manual, in page order. A sheet starts at the
 * "FICHA DE FISCALIZAÇÃO" title and runs until the next one.
 */
export function lerFichas(paginas: Pagina[]): FichaMbft[] {
  const fichas: FichaMbft[] = [];
  let atual: { linhas: Linha[]; pagina: number } | null = null;

  const fechar = () => {
    if (!atual) return;
    const ficha = lerFicha(atual.linhas, atual.pagina);
    if (ficha?.codigo) fichas.push(ficha);
    atual = null;
  };

  for (const pagina of paginas) {
    for (const linha of pagina.linhas) {
      if (ehCabecalho(linha)) continue;
      if (texto(linha) === 'FICHA DE FISCALIZAÇÃO') {
        fechar();
        atual = { linhas: [], pagina: pagina.numero };
        continue;
      }
      atual?.linhas.push(linha);
    }
  }
  fechar();
  return fichas;
}
