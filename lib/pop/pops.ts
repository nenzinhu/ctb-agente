// The POP-PMSC manual bundled with the app (data/acervo/pop-pmsc.json, built by
// scripts/importar-pops.ts): every procedure complete, in its standard form.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buscarNoIndice, criarIndiceBusca, palavrasBusca, type IndiceBusca } from '@/lib/search/lexical';
import type { Pop } from './parser';
import { numeroPop } from '@/lib/query/router';

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

const indices = new WeakMap<Pop[], IndiceBusca<Pop>>();

function indiceDosPops(pops: Pop[]): IndiceBusca<Pop> {
  let indice = indices.get(pops);
  if (!indice) {
    indice = criarIndiceBusca(pops.map((pop) => ({
      item: pop,
      titulo: pop.titulo,
      corpo: [
        pop.execucao,
        ...pop.material.map((i) => i.texto),
        ...pop.fundamentacao.flatMap((norma) => [norma.norma, norma.especificacao]),
        ...[pop.sequencia, pop.atividadesCriticas, pop.errosEvitar, pop.anexos].flat().map((i) => i.texto),
      ].join(' '),
      campos: [
        { texto: pop.execucao, peso: 2 },
        { texto: pop.sequencia.map((i) => i.texto).join(' '), peso: 2.25 },
        { texto: pop.atividadesCriticas.map((i) => i.texto).join(' '), peso: 2.5 },
        { texto: pop.errosEvitar.map((i) => i.texto).join(' '), peso: 1.75 },
        { texto: pop.material.map((i) => i.texto).join(' '), peso: 1.5 },
        { texto: pop.fundamentacao.flatMap((norma) => [norma.norma, norma.especificacao]).join(' '), peso: 0.75 },
        { texto: pop.anexos.map((i) => i.texto).join(' '), peso: 0.5 },
      ],
    })));
    indices.set(pops, indice);
  }
  return indice;
}

/**
 * POPs matching a question, best first: by number ("POP 002", "201.4.29") or
 * by the words of the question, weighted towards the title.
 * @param pergunta - Question, already PII-filtered
 * @param limite - Maximum POPs
 */
export function buscarPops(pergunta: string, limite = 6, pops = todosOsPops()): Pop[] {
  if (!pergunta.trim() || limite <= 0) return [];
  const numero = numeroPop(pergunta);
  if (numero) {
    return pops.filter((p) => p.numero === numero).slice(0, limite);
  }
  return buscarNoIndice(pergunta, indiceDosPops(pops), limite);
}

/** Relaxed alternatives used only as visible suggestions after a safe search
 * found nothing. They are never treated as the answer. */
export function sugerirPops(pergunta: string, limite = 3, pops = todosOsPops()): Pop[] {
  const termos = palavrasBusca(pergunta);
  if (!termos.length || limite <= 0) return [];
  return indiceDosPops(pops).documentos
    .map(({ item, titulo, corpo, campos }) => ({
      item,
      pontos: termos.reduce((total, termo) => total + Math.max(
        titulo.has(termo) ? 3 : 0,
        corpo.has(termo) ? 1 : 0,
        ...campos.filter((campo) => campo.palavras.has(termo)).map((campo) => campo.peso)
      ), 0),
    }))
    .filter(({ pontos }) => pontos > 0)
    .sort((a, b) => b.pontos - a.pontos)
    .slice(0, limite)
    .map(({ item }) => item);
}
