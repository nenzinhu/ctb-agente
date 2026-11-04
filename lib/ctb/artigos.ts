export interface ArtigoCtb { numero: string; texto: string }
export interface ArtigoConsulta extends ArtigoCtb { versao: string; fonte: string; aviso: string }
export const FONTE_CTB = 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm';
export const AVISO_ACERVO = 'Cópia do acervo incluído no aplicativo. Confira a redação vigente na fonte oficial antes de atuar.';
export function numeroArtigo(valor: string): string | null {
  const match = valor.trim().replace(/\s*([-–])\s*/g, '$1').match(/^(?:art(?:igo)?\.?\s*)?(\d{1,3})(?:[º°o])?(?:[-–]([a-z]))?\.?$/i);
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 341) return null;
  return `${Number(match[1])}${match[2] ? `-${match[2].toUpperCase()}` : ''}`;
}
export function extrairArtigosCtb(texto: string): ArtigoCtb[] {
  const limpo = texto.replace(/^--- Página \d+ ---\s*$/gm, '').split(/^ANEXO\s+I\s*$/m)[0];
  const matches = [...limpo.matchAll(/^Art\.\s*(\d{1,3}(?:[º°o])?(?:-[A-Z])?)\.?\s+/gm)];
  return matches.flatMap((m, i) => {
    const numero = numeroArtigo(m[1]);
    return numero ? [{ numero, texto: limpo.slice(m.index, matches[i + 1]?.index ?? limpo.length).trim() }] : [];
  });
}
