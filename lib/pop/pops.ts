// The POP-PMSC manual bundled with the app (data/acervo/pop-pmsc.json, built by
// scripts/importar-pops.ts): every procedure complete, in its standard form.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expandirSinonimos } from '@/lib/search/sinonimos';
import type { Pop } from './parser';

let cache: Pop[] | null = null;

/** All POPs, read once per server instance */
export function todosOsPops(): Pop[] {
  if (!cache) {
    try {
      cache = JSON.parse(readFileSync(path.join(process.cwd(), 'data/acervo/pop-pmsc.json'), 'utf8')) as Pop[];
    } catch (error) {
      console.warn('POP manual unavailable:', error);
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
  'que com sem para por pela pelo nos nas dos das uma uns umas como onde quando qual quais deve devo fazer procedimento procedimentos proceder pop pops policial policia militar'.split(' ')
);

function palavras(t: string): string[] {
  return normalizar(t)
    .split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 3 && !PALAVRAS_VAZIAS.has(p));
}

const texto = (pop: Pop) =>
  [pop.sequencia, pop.atividadesCriticas, pop.errosEvitar].flat().map((i) => i.texto).join(' ');

/**
 * POPs matching a question, best first: by number ("POP 002", "201.4.29") or
 * by the words of the question, weighted towards the title.
 * @param pergunta - Question, already PII-filtered
 * @param limite - Maximum POPs
 */
export function buscarPops(pergunta: string, limite = 6, pops = todosOsPops()): Pop[] {
  const numero = pergunta.match(/\b(\d{3}(?:\.\d+){0,3})\b/)?.[1];
  if (numero) {
    const exato = pops.filter((p) => p.numero === numero);
    if (exato.length) return exato;
  }

  const termos = [...new Set(palavras(expandirSinonimos(pergunta)))];
  if (termos.length === 0) return [];

  const tem = (conjunto: Set<string>, termo: string) =>
    conjunto.has(termo) || (termo.length >= 5 && [...conjunto].some((p) => p.startsWith(termo.slice(0, 5))));

  const pontuados = pops
    .map((pop) => {
      const titulo = new Set(palavras(pop.titulo));
      const corpo = new Set(palavras(texto(pop)));
      const pontos = termos.reduce((soma, t) => soma + (tem(titulo, t) ? 3 : tem(corpo, t) ? 1 : 0), 0);
      return { pop, pontos };
    })
    .filter((x) => x.pontos > 0);

  const melhor = Math.max(0, ...pontuados.map((x) => x.pontos));
  const minimo = Math.max(2, Math.ceil(melhor * 0.5));
  return pontuados
    .filter((x) => x.pontos >= minimo)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map((x) => x.pop);
}
