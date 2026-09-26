// The MBFT sheets bundled with the app (data/acervo/mbft-fichas.json, built by
// scripts/importar-mbft.ts): complete, with code, independent of the database.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expandirSinonimos } from '@/lib/search/sinonimos';
import type { FichaMbft } from './parser';

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

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const PALAVRAS_VAZIAS = new Set(
  'que com sem para por pela pelo nos nas dos das uma uns umas the via quando como onde esta este isso essa ser ter tem sua seu veiculo'.split(' ')
);

function palavras(t: string): string[] {
  return normalizar(t)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p));
}

/** "art. 181, XVII" → { artigo: "181", inciso: "xvii" } */
function referencia(consulta: string): { artigo: string; resto: string[] } | null {
  const m = normalizar(consulta).match(/\bart(?:igo)?\.?\s*(\d{2,3}(?:-[a-z])?)\b(.*)$/);
  if (!m) return null;
  const resto = m[2].split(/[^a-z0-9º]+/).filter((p) => /^[ivxlc]+$|^\d+º?$/.test(p));
  return { artigo: m[1], resto };
}

/**
 * Sheets matching a consultation, best first: by MBFT code, by article
 * (and inciso/paragraph when given), or by the words of a described situation.
 * @param consulta - Query, already PII-filtered
 * @param limite - Maximum sheets
 */
export function buscarFichas(consulta: string, limite = 8, fichas = todasAsFichas()): FichaMbft[] {
  const texto = consulta.trim();
  if (!texto) return [];

  const codigo = texto.match(/\b(\d{3})\s?-?\s?(\d{2})\b/);
  if (codigo) {
    const alvo = `${codigo[1]}-${codigo[2]}`;
    const exatas = fichas.filter((f) => f.codigo === alvo);
    if (exatas.length) return exatas.slice(0, limite);
    const mesmoCodigo = fichas.filter((f) => f.codigo.startsWith(`${codigo[1]}-`));
    if (mesmoCodigo.length) return mesmoCodigo.slice(0, limite);
  }

  const ref = referencia(texto);
  if (ref) {
    const doArtigo = fichas.filter((f) => new RegExp(`\\bart\\.?\\s*${ref.artigo}\\b(?!-)`).test(normalizar(f.amparoLegal)));
    if (doArtigo.length) {
      if (ref.resto.length === 0) return doArtigo.slice(0, limite);
      const partes = (f: FichaMbft) => normalizar(f.amparoLegal).split(/[^a-z0-9º]+/);
      const exatas = doArtigo.filter((f) => ref.resto.every((p) => partes(f).includes(p)));
      return (exatas.length ? exatas : doArtigo).slice(0, limite);
    }
  }

  // Field slang ("bafômetro", "moto") → the manual's words
  const termos = [...new Set(palavras(expandirSinonimos(texto)))];
  if (termos.length === 0) return [];
  const pontuadas = fichas
    .map((f) => {
      const resumo = new Set(palavras(f.tipificacaoResumida));
      const corpo = new Set(palavras(`${f.tipificacao} ${f.quandoAutuar.join(' ')}`));
      // Prefix match tolerates plural/verb forms ("estacionar"/"estacionado")
      const tem = (conjunto: Set<string>, termo: string) =>
        [...conjunto].some((p) => p === termo || (termo.length >= 5 && p.startsWith(termo.slice(0, 5))));
      const pontos = termos.reduce((soma, t) => soma + (tem(resumo, t) ? 2 : tem(corpo, t) ? 1 : 0), 0);
      return { f, pontos };
    })
    .filter((x) => x.pontos > 0);

  const melhor = Math.max(0, ...pontuadas.map((x) => x.pontos));
  const minimo = Math.max(2, Math.ceil(melhor * 0.6));
  return pontuadas
    .filter((x) => x.pontos >= minimo)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map((x) => x.f);
}
