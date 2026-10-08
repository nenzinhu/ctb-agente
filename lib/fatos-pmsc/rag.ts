import type { TrechoEncontrado } from '@/lib/search/trechos';
import { normalizarBusca } from '@/lib/search/sinonimos';
import type { FatoPmsc } from './parser';
export { textoRagFatos } from './parser';

export interface AlternativaFatoPmsc {
  fato: FatoPmsc;
  origem: 'local' | 'rag';
}

function naturezaDoTrecho(texto: string): string | null {
  return /^Natureza:\s*(.+)$/im.exec(texto)?.[1]?.trim() ?? null;
}

export function combinarFatosComRag(
  locais: FatoPmsc[],
  trechos: TrechoEncontrado[],
  catalogo: FatoPmsc[]
): AlternativaFatoPmsc[] {
  const alternativas: AlternativaFatoPmsc[] = locais.map((fato) => ({ fato, origem: 'local' }));
  for (const trecho of trechos) {
    const natureza = naturezaDoTrecho(trecho.texto);
    if (!natureza) continue;
    const oficial = catalogo.find((fato) => normalizarBusca(fato.natureza) === normalizarBusca(natureza));
    if (oficial) alternativas.push({ fato: oficial, origem: 'rag' });
  }
  return alternativas
    .filter((item, indice, lista) => lista.findIndex((outro) => outro.fato.natureza === item.fato.natureza) === indice)
    .slice(0, 3);
}
