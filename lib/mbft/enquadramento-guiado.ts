import { codigoMbft } from '@/lib/query/router';
import { palavrasBusca, similaridadePalavra } from '@/lib/search/lexical';
import { buscarFichas, todasAsFichas } from './fichas';
import type { FichaMbft } from './parser';

export type RespostaGuiada = 'sim' | 'nao' | 'nao_informado';
export type RespostasGuiadas = Record<string, RespostaGuiada>;

export interface PerguntaGuiada {
  id: string;
  texto: string;
  criterio: string;
  fonte: 'quando_autuar' | 'quando_nao_autuar';
  codigos: string[];
}

export interface CandidatoGuiado {
  ficha: FichaMbft;
  pontuacao: number;
  evidenciasFavoraveis: string[];
  evidenciasContrarias: string[];
}

export interface ResultadoGuiado {
  candidatos: CandidatoGuiado[];
  perguntas: PerguntaGuiada[];
  decisaoAutomatica: false;
  contradicao: boolean;
}

function limparCriterio(texto: string): string {
  return texto.replace(/^\s*\d+\s*[.)-]\s*/, '').replace(/\s+/g, ' ').trim();
}

function chave(texto: string): string {
  return limparCriterio(texto).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function perguntasDasFichas(fichas: FichaMbft[]): PerguntaGuiada[] {
  const ocorrencias = new Map<string, number>();
  for (const ficha of fichas) {
    for (const criterio of [...ficha.quandoAutuar, ...ficha.quandoNaoAutuar]) {
      const id = chave(criterio);
      if (id) ocorrencias.set(id, (ocorrencias.get(id) ?? 0) + 1);
    }
  }

  const perguntas: PerguntaGuiada[] = [];
  for (const ficha of fichas) {
    for (const [fonte, criterios] of [
      ['quando_autuar', ficha.quandoAutuar],
      ['quando_nao_autuar', ficha.quandoNaoAutuar],
    ] as const) {
      criterios.forEach((bruto, indice) => {
        const criterio = limparCriterio(bruto);
        const idCriterio = chave(criterio);
        if (!criterio || ocorrencias.get(idCriterio) !== 1) return;
        perguntas.push({
          id: `${ficha.codigo}:${fonte}:${indice}`,
          texto: `Foi observado que ${criterio.charAt(0).toLowerCase()}${criterio.slice(1).replace(/[.;:]$/, '')}?`,
          criterio,
          fonte,
          codigos: [ficha.codigo],
        });
      });
    }
  }
  return perguntas.slice(0, 12);
}

function ampliarCandidatos(descricao: string, principais: FichaMbft[], fichas: FichaMbft[]): FichaMbft[] {
  const termos = palavrasBusca(descricao);
  if (!termos.length) return principais.slice(0, 3);

  const pontuados = fichas.map((ficha) => {
    const vocabulario = palavrasBusca([
      ficha.tipificacaoResumida,
      ficha.tipificacao,
      ...ficha.quandoAutuar,
      ...ficha.exemplos,
    ].join(' '));
    const cobertura = termos.filter((termo) =>
      vocabulario.some((palavra) => similaridadePalavra(termo, palavra) >= 0.8)
    ).length;
    return { ficha, cobertura };
  });
  const coberturaMaxima = Math.max(0, ...pontuados.map((item) => item.cobertura));
  const minimo = Math.max(2, coberturaMaxima - 1);
  const complementares = pontuados
    .filter((item) => item.cobertura >= minimo)
    .sort((a, b) => b.cobertura - a.cobertura || a.ficha.codigo.localeCompare(b.ficha.codigo))
    .map((item) => item.ficha);

  return [...principais, ...complementares]
    .filter((ficha, indice, lista) => lista.findIndex((item) => item.codigo === ficha.codigo) === indice)
    .slice(0, 3);
}

export function avaliarEnquadramento({
  descricao,
  respostas = {},
  fichas = todasAsFichas(),
}: {
  descricao: string;
  respostas?: RespostasGuiadas;
  fichas?: FichaMbft[];
}): ResultadoGuiado {
  const codigo = codigoMbft(descricao);
  const principais = buscarFichas(descricao, codigo ? 1 : 3, fichas);
  const encontradas = codigo ? principais : ampliarCandidatos(descricao, principais, fichas);
  if (codigo && encontradas.length === 0) {
    return { candidatos: [], perguntas: [], decisaoAutomatica: false, contradicao: false };
  }

  const perguntas = codigo ? [] : perguntasDasFichas(encontradas);
  let contradicao = false;
  const candidatos = encontradas.map((ficha, ordem): CandidatoGuiado => {
    let pontuacao = 100 - ordem;
    const evidenciasFavoraveis: string[] = [];
    const evidenciasContrarias: string[] = [];
    for (const pergunta of perguntas.filter((item) => item.codigos.includes(ficha.codigo))) {
      const resposta = respostas[pergunta.id];
      if (!resposta || resposta === 'nao_informado') continue;
      const favoravel = (pergunta.fonte === 'quando_autuar' && resposta === 'sim')
        || (pergunta.fonte === 'quando_nao_autuar' && resposta === 'nao');
      if (favoravel) {
        pontuacao += 20;
        evidenciasFavoraveis.push(pergunta.criterio);
      } else {
        pontuacao -= 30;
        evidenciasContrarias.push(pergunta.criterio);
      }
    }
    if (evidenciasFavoraveis.length && evidenciasContrarias.length) contradicao = true;
    return { ficha, pontuacao, evidenciasFavoraveis, evidenciasContrarias };
  }).sort((a, b) => b.pontuacao - a.pontuacao || a.ficha.codigo.localeCompare(b.ficha.codigo));

  return {
    candidatos,
    perguntas: perguntas.filter((pergunta) => !respostas[pergunta.id]),
    decisaoAutomatica: false,
    contradicao,
  };
}
