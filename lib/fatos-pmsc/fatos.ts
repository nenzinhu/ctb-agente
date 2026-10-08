import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buscarNoIndice, criarIndiceBusca, type IndiceBusca } from '@/lib/search/lexical';
import { normalizarBusca } from '@/lib/search/sinonimos';
import type { FatoPmsc } from './parser';

let cache: FatoPmsc[] | null = null;
const indices = new WeakMap<FatoPmsc[], IndiceBusca<FatoPmsc>>();

export function todosOsFatosPmsc(): FatoPmsc[] {
  if (!cache) {
    try {
      cache = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/fatos-pmsc-mobile.json'), 'utf8')) as FatoPmsc[];
    } catch (error) {
      console.warn('Catálogo de fatos PMSC indisponível:', error);
      cache = [];
    }
  }
  return cache;
}

function consultaOperacional(consulta: string): string {
  const texto = normalizarBusca(consulta);
  if (/\b(?:som alto|pancadao|barulho|perturb.*sossego)\b/.test(texto)) return 'perturbação do trabalho ou sossego alheios';
  if (/\b(?:perdeu|perda|extravi).*(?:doc|obj)|\bdoc(?:s|umento)?.*(?:perd|extravi)/.test(texto)) return 'perda de documentos ou objetos';
  if (/\b(?:acid|acidente|batida|colisao).*(?:dano|mater)/.test(texto)) return 'acidente de trânsito apenas danos materiais';
  if (/\b(?:briga|vias?\s+(?:de\s+)?fat)/.test(texto)) return 'vias de fato';
  return consulta;
}

function atalhosOperacionais(consulta: string, fatos: FatoPmsc[]): FatoPmsc[] {
  const texto = normalizarBusca(consulta);
  let naturezas: string[] = [];
  if (/\bsuic|\b(?:tent|quer|quis|ia)\w*\s+(?:se\s+)?matar|tirar\s+a?\s*propria\s+vida|acabar\s+com\s+a?\s*propria\s+vida/.test(texto)) {
    naturezas = ['Suicídio'];
  } else if (
    /\b(?:bateu|batida|colis|acid)\w*.*\b(?:ferid|feriu|machuc|lesion|vitima)\w*/.test(texto)
    || /\b(?:ferid|feriu|machuc|lesion|vitima)\w*.*\b(?:carro|veiculo|transito|acidente)\b/.test(texto)
  ) {
    naturezas = [
      'Acidente de trânsito (Com pessoa ferida ou morta)',
      'Lesão corporal culposa em acidente de trânsito',
    ];
  }
  return naturezas.flatMap((natureza) => fatos.filter((fato) => fato.natureza === natureza));
}

function indice(fatos: FatoPmsc[]): IndiceBusca<FatoPmsc> {
  let existente = indices.get(fatos);
  if (!existente) {
    existente = criarIndiceBusca(fatos.map((fato) => ({
      item: fato,
      titulo: fato.natureza,
      corpo: `${fato.grupo} ${fato.potencialOfensivo}`,
    })));
    indices.set(fatos, existente);
  }
  return existente;
}

export function buscarFatosPmsc(consulta: string, limite = 3, fatos = todosOsFatosPmsc()): FatoPmsc[] {
  const texto = normalizarBusca(consulta).trim();
  if (!texto || /^(?:fato|fatos|lista|natureza|potencial|ocorrencia)$/.test(texto)) return [];
  const maximo = Math.min(3, Math.max(0, limite));
  return [
    ...atalhosOperacionais(consulta, fatos),
    ...buscarNoIndice(consultaOperacional(consulta), indice(fatos), maximo),
  ].filter((fato, posicao, lista) => lista.findIndex((item) => item.natureza === fato.natureza) === posicao)
    .slice(0, maximo);
}
