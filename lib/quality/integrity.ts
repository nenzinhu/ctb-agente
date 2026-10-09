import { DEFAULT_MIN_CHUNK_CHARS } from '@/lib/ingestion/chunker';

export interface MetricasIntegridade {
  itens: number;
  vazios: number;
  curtos: number;
  semEstrutura: number;
  duplicados: number;
  invalidos: number;
}

function normalizar(valor: string): string {
  return valor.replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');
}

export function analisarItensLocais(
  items: Array<{ id: string; texto: string; estruturado: boolean }>,
): MetricasIntegridade {
  let vazios = 0;
  let curtos = 0;
  let semEstrutura = 0;
  const ids = new Set<string>();
  const textos = new Set<string>();
  const indicesDuplicados = new Set<number>();

  items.forEach((item, indice) => {
    const texto = item.texto.trim();
    if (!texto) vazios++;
    else if (texto.length < DEFAULT_MIN_CHUNK_CHARS) curtos++;
    if (!item.estruturado) semEstrutura++;

    if (ids.has(item.id)) indicesDuplicados.add(indice);
    ids.add(item.id);
    const textoNormalizado = normalizar(item.texto);
    if (textoNormalizado) {
      if (textos.has(textoNormalizado)) indicesDuplicados.add(indice);
      textos.add(textoNormalizado);
    }
  });

  return {
    itens: items.length,
    vazios,
    curtos,
    semEstrutura,
    duplicados: indicesDuplicados.size,
    invalidos: vazios + curtos + semEstrutura,
  };
}
