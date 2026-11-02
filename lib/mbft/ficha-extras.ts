// Deterministic extras for an MBFT sheet: the crime warning, a sentence to
// read to the driver, and the laws that changed the article. No AI: every
// word comes from the sheet or from the compiled CTB text.
import type { FichaMbft } from './parser';

/**
 * The crime articles when the sheet says the infraction can also be a crime.
 * @returns "Art. 306 e 310 do CTB …", or null when it is not a crime
 */
export function crimeDaFicha(ficha: Pick<FichaMbft, 'configuraCrime'>): string | null {
  const valor = ficha.configuraCrime.trim();
  if (!/^(sim\b|art\.)/i.test(valor)) return null;
  const artigos = valor
    .replace(/^sim\b\s*/i, '')
    .replace(/\s*\(Vide[^)]*\)/gi, '')
    .replace(/^\((.*)\)$/, '$1')
    .replace(/\.$/, '')
    .trim();
  if (!artigos) return 'Art. do CTB não indicado na ficha';
  return /^art\./i.test(artigos) ? artigos : `Art. ${artigos}`;
}

/** The MBFT short wording is often abbreviated ("Rec sub test", "veíc c/"). */
function abreviada(texto: string): boolean {
  if (/[\/ñ]/.test(texto)) return true;
  return (texto.match(/[A-Za-zÀ-ú]+/g) ?? []).some(
    (p) => !(p.length > 1 && p === p.toUpperCase()) && /[^aeiouáéíóúâêôãõàsrlmzx]$/.test(p.toLowerCase())
  );
}

/** The infraction in words a driver understands, never legal cross-references. */
function descricao(ficha: FichaMbft): string {
  const resumo = semPonto(ficha.tipificacaoResumida);
  const completa = semPonto(ficha.tipificacao ?? '');
  const juridica = /^(art\.|nenhuma|incorre|incide|aplica-se|a hipótese)/i.test(completa);
  return abreviada(resumo) && completa && !juridica ? completa : resumo;
}

const minuscula = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
const semPonto = (t: string) => t.trim().replace(/\.+$/, '');

/** What the agent can read to the driver: polite, plain, no deadlines in days. */
export function explicarAoCidadao(ficha: FichaMbft): string {
  const partes = [
    `O(a) senhor(a) foi autuado(a) pela seguinte infração: “${descricao(ficha)}”.`,
    `É uma infração ${ficha.gravidade.toLowerCase()}, prevista no ${minuscula(semPonto(ficha.amparoLegal))} do Código de Trânsito Brasileiro.`,
  ];
  const medida = semPonto(ficha.medidaAdministrativa ?? '');
  if (medida && !/^n[ãa]o\b/i.test(medida)) {
    partes.push(`Neste momento, a medida aplicada é: ${minuscula(semPonto(medida.replace(/\s*\(Vide[^)]*\)/gi, '')))}.`);
  }
  partes.push(
    'O valor e os pontos virão na notificação. O(a) senhor(a) tem direito de apresentar defesa no prazo que consta na notificação.'
  );
  return partes.join(' ');
}

const ESTRUTURA = /^(Art\.\s|[IVXLC]+\s*-|§\s*\d|Parágrafo único|[a-z]\)\s|Infração\s*-|Penalidade\s*-|Medida administrativa)/;

/** Article text split into its structural units (caput, incisos, §, alíneas). */
function unidadesDoArtigo(ctb: string, artigo: string): string[] {
  const linhas = ctb.split('\n');
  const inicio = linhas.findIndex((l) => l.startsWith(`Art. ${artigo}.`));
  if (inicio < 0) return [];
  const unidades: string[] = [];
  for (let i = inicio; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (i > inicio && linha.startsWith('Art. ')) break;
    if (!linha) continue;
    if (i === inicio || ESTRUTURA.test(linha)) unidades.push(linha);
    else unidades[unidades.length - 1] += ` ${linha}`;
  }
  return unidades;
}

/**
 * Laws that wrote or changed the article (narrowed to the inciso, paragraph
 * or alínea the sheet cites), oldest first, straight from the compiled CTB.
 * @param amparoLegal - "Art. 252, parágrafo único." as printed on the sheet
 */
export function historicoDaLei(amparoLegal: string, ctb: string): string[] {
  const m = amparoLegal.match(/Art\.?\s*(\d+(?:-[A-Z])?)(.*)$/i);
  if (!m) return [];
  const unidades = unidadesDoArtigo(ctb, m[1].toUpperCase());
  if (unidades.length === 0) return [];

  // Only the part before any "c/c" refers to this article
  const resto = m[2].split(/c\/c/i)[0];
  const inciso = resto.match(/,\s*([IVXLC]+)\b/)?.[1];
  const alinea = resto.match(/,\s*[IVXLC]+\s*,\s*([a-z])\b/)?.[1];
  const paragrafo = /par[áa]grafo único/i.test(resto) ? 'Parágrafo único' : resto.match(/§\s*(\d+)/)?.[1];

  let alvo = unidades;
  if (paragrafo) {
    alvo = unidades.filter((u) =>
      paragrafo === 'Parágrafo único' ? u.startsWith('Parágrafo único') : new RegExp(`^§\\s*${paragrafo}\\D`).test(u)
    );
  } else if (inciso) {
    const i = unidades.findIndex((u) => new RegExp(`^${inciso}\\s*-`).test(u));
    if (i >= 0) {
      alvo = [unidades[i]];
      if (alinea) {
        const a = unidades.slice(i + 1).find((u) => u.startsWith(`${alinea})`));
        if (a) alvo.push(a);
      }
    } else alvo = [];
  }

  const notas = alvo
    .join(' ')
    .match(/\((?:Redação dada|Incluíd[oa]|Acrescentad[oa])[^)]*\)/g);
  if (!notas) return [];
  const limpas = notas.map((n) =>
    n
      .slice(1, -1)
      .replace(/\s+/g, ' ')
      .replace(/(\d+)\.\s+(\d)/g, '$1.$2')
      .replace(/\bn[oº°]\s/g, 'nº ')
      .trim()
  );
  const ano = (t: string) => Number(t.match(/de (\d{4})/)?.[1] ?? 0);
  return [...new Set(limpas)].sort((a, b) => ano(a) - ano(b));
}
