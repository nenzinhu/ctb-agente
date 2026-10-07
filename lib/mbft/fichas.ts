// The MBFT sheets bundled with the app (data/acervo/mbft-fichas.json, built by
// scripts/importar-mbft.ts): complete, with code, independent of the database.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { normalizarBusca } from '@/lib/search/sinonimos';
import { buscarNoIndice, criarIndiceBusca, type IndiceBusca } from '@/lib/search/lexical';
import type { FichaMbft } from './parser';
import { codigoMbft, extractArticleRef } from '@/lib/query/router';

let cache: FichaMbft[] | null = null;

/** All sheets, read once per server instance */
export function todasAsFichas(): FichaMbft[] {
  if (!cache) {
    try {
      cache = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/mbft-fichas.json'), 'utf8')) as FichaMbft[];
    } catch (error) {
      console.warn('MBFT sheets unavailable:', error);
      cache = [];
    }
  }
  return cache;
}

const normalizar = normalizarBusca;
const indices = new WeakMap<FichaMbft[], IndiceBusca<FichaMbft>>();

function indiceDasFichas(fichas: FichaMbft[]): IndiceBusca<FichaMbft> {
  let indice = indices.get(fichas);
  if (!indice) {
    indice = criarIndiceBusca(fichas.map((f) => ({
      item: f,
      titulo: f.tipificacaoResumida,
      // Do not rank a sheet for an offense mentioned only in "Quando NÃO
      // Autuar" or cross-references to a different code.
      // Official examples often use the same concrete wording an agent types
      // at the roadside, while "Quando não autuar" stays excluded so an
      // exception can never promote the wrong sheet.
      corpo: `${f.tipificacao} ${f.quandoAutuar.join(' ')} ${f.exemplos.join(' ')}`,
    })));
    indices.set(fichas, indice);
  }
  return indice;
}

/** "art. 181, XVII" → { artigo: "181", inciso: "xvii" } */
function referencia(consulta: string): { artigo: string; resto: string[] } | null {
  const ref = extractArticleRef(consulta);
  if (!ref) return null;
  const m = ref.match(/^art\.\s*(\d{1,3}(?:-[a-z])?)(.*)$/i);
  if (!m) return null;
  const resto = m[2].toLowerCase().split(/[^a-z0-9º]+/).filter((p) => /^[ivxlcdm]+$|^\d+º?$/.test(p));
  return { artigo: m[1].toLowerCase(), resto };
}

/**
 * Sheets matching a consultation, best first: by MBFT code, by article
 * (and inciso/paragraph when given), or by the words of a described situation.
 * @param consulta - Query, already PII-filtered
 * @param limite - Maximum sheets
 */
export function buscarFichas(consulta: string, limite = 8, fichas = todasAsFichas()): FichaMbft[] {
  const texto = consulta.trim();
  if (!texto || limite <= 0) return [];

  const codigo = codigoMbft(texto);
  // A complete identifier is authoritative, even when absent from the corpus.
  // Never silently substitute a different legal desdobramento.
  if (codigo) return fichas.filter((f) => f.codigo === codigo).slice(0, Math.max(0, limite));

  const ref = referencia(texto);
  if (ref) {
    const doArtigo = fichas.filter((f) => new RegExp(`\\bart\\.?\\s*${ref.artigo}\\b(?!-)`).test(normalizar(f.amparoLegal)));
    if (doArtigo.length) {
      if (ref.resto.length === 0) return doArtigo.slice(0, limite);
      const partes = (f: FichaMbft) => normalizar(f.amparoLegal).split(/[^a-z0-9º]+/);
      const exatas = doArtigo.filter((f) => ref.resto.every((p) => partes(f).includes(p)));
      return exatas.slice(0, Math.max(0, limite));
    }
    return [];
  }

  return buscarNoIndice(texto, indiceDasFichas(fichas), limite);
}
