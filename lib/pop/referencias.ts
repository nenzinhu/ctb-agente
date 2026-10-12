export interface ResumoPop {
  numero: string;
  titulo: string;
}

export type SegmentoReferenciaPop =
  | { tipo: 'texto'; texto: string }
  | { tipo: 'referencia'; texto: string; numero: string; titulo: string };

const REFERENCIA_POP = /\bPOP(?:\s+(?:n(?:[º°o]\.?|\.)|número))?\s*[:\-]?\s*(\d{3}(?:\.\d+)*)\b/giu;

/** Separa apenas referências cujo número existe no catálogo oficial carregado. */
export function segmentarReferenciasPop(texto: string, catalogo: ResumoPop[]): SegmentoReferenciaPop[] {
  const porNumero = new Map(catalogo.map((pop) => [pop.numero, pop]));
  const segmentos: SegmentoReferenciaPop[] = [];
  let inicioTexto = 0;

  for (const correspondencia of texto.matchAll(REFERENCIA_POP)) {
    const numero = correspondencia[1];
    const pop = porNumero.get(numero);
    if (!pop || correspondencia.index === undefined) continue;

    if (correspondencia.index > inicioTexto) {
      segmentos.push({ tipo: 'texto', texto: texto.slice(inicioTexto, correspondencia.index) });
    }
    segmentos.push({
      tipo: 'referencia',
      texto: correspondencia[0],
      numero,
      titulo: pop.titulo,
    });
    inicioTexto = correspondencia.index + correspondencia[0].length;
  }

  if (inicioTexto < texto.length || segmentos.length === 0) {
    segmentos.push({ tipo: 'texto', texto: texto.slice(inicioTexto) });
  }
  return segmentos;
}
