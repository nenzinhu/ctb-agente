const OUTRA_NORMA = /\b(?:CP|CPP|CPC|CF|CC|ECA)\b|constitui[çc][ãa]o|c[oó]digo\s+(?:penal|civil|de\s+processo)|\b(?:resolu[çc][ãa]o|portaria|decreto)\b|\blei\s+(?:n[º°o.]?\s*)?\d/iu;
export function contextoCtbSeguro(texto: string): boolean {
  return /\bCTB\b|c[oó]digo\s+de\s+tr[âa]nsito\s+brasileiro/iu.test(texto) && !OUTRA_NORMA.test(texto);
}

export function referenciasCtb(texto: string, contextoCtb = false) {
  const segmentos: { texto: string; href?: string }[] = [];
  const contextoSeguro = (contextoCtb || contextoCtbSeguro(texto)) && !OUTRA_NORMA.test(texto);
  const regex = /\bart(?:igo)?\.?\s*(\d{1,3})(?:\s*[-–]\s*([a-z]))?(?![\d\p{L}])/giu;
  let inicio = 0;
  for (const match of texto.matchAll(regex)) {
    const fim = match.index! + match[0].length;
    const explicito = /^\s*(?:do\s+)?CTB\b/iu.test(texto.slice(fim));
    const numero = Number(match[1]);
    if ((!contextoSeguro && !explicito) || numero < 1 || numero > 341) continue;
    if (match.index! > inicio) segmentos.push({ texto: texto.slice(inicio, match.index) });
    segmentos.push({ texto: match[0], href: `https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm#art${numero}${(match[2] ?? '').toLowerCase()}` });
    inicio = fim;
  }
  if (inicio < texto.length || !segmentos.length) segmentos.push({ texto: texto.slice(inicio) });
  return segmentos;
}
