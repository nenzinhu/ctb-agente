import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import fichasMbftJson from '@/data/acervo/mbft-fichas.json';

export interface TrechoPeso {
  id: string;
  documento: string;
  referencia: string;
  pagina: number;
  texto: string;
  codigo?: string;
}

interface FichaMbftPeso {
  codigo: string;
  tipificacaoResumida?: string;
  amparoLegal?: string;
  tipificacao?: string;
  penalidade?: string;
  medidaAdministrativa?: string;
  infrator?: string;
  quandoAutuar?: string[];
  quandoNaoAutuar?: string[];
  definicoes?: string[];
  informacoesComplementares?: string[];
  pagina?: number;
}

const CODIGOS_PESO = new Set(['683-11', '683-12', '683-13', '688-20', '689-00', '690-40']);

function limparPagina(texto: string): string {
  return texto
    .split('\n')
    .filter((linha) => !/^\s*https?:\/\//i.test(linha))
    .filter((linha) => !/^\s*\d{2}\/\d{2}\/\d{4},\s+\d{2}:\d{2}/.test(linha))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function referenciaArtigo(numero: string): string {
  return `Art. ${numero.replace(/º$/, '')}`;
}

function carregarResolucao(): TrechoPeso[] {
  const caminho = join(process.cwd(), 'data', 'acervo', 'resolucao-contran-882-2021.txt');
  const paginas = readFileSync(caminho, 'utf8').split('\f');
  const trechos: TrechoPeso[] = [];
  let referenciaAnterior = 'Ementa e disposições iniciais';

  paginas.forEach((paginaBruta, indicePagina) => {
    const pagina = limparPagina(paginaBruta);
    const marcadores = [...pagina.matchAll(/\bArt\.\s*(\d+[A-Z]?)\s*[º°]?\.?/g)];
    const limites = [0, ...marcadores.map((marcador) => marcador.index ?? 0), pagina.length]
      .filter((valor, indice, todos) => indice === 0 || valor !== todos[indice - 1]);

    for (let indice = 0; indice < limites.length - 1; indice++) {
      const inicio = limites[indice];
      const fim = limites[indice + 1];
      const texto = pagina.slice(inicio, fim).trim();
      if (texto.length < 40) continue;
      const artigo = texto.match(/^Art\.\s*(\d+[A-Z]?)\s*[º°]?\.?/);
      if (artigo) referenciaAnterior = referenciaArtigo(artigo[1]);
      trechos.push({
        id: `res-882-p${indicePagina + 1}-${indice}`,
        documento: 'Resolução CONTRAN nº 882/2021',
        referencia: referenciaAnterior,
        pagina: indicePagina + 1,
        texto,
      });
    }
  });

  return trechos;
}

function textoFicha(ficha: FichaMbftPeso): string {
  return [
    ficha.tipificacaoResumida,
    ficha.tipificacao,
    ficha.penalidade,
    ficha.medidaAdministrativa,
    ficha.infrator ? `Infrator: ${ficha.infrator}.` : '',
    ...(ficha.quandoAutuar ?? []),
    ...(ficha.quandoNaoAutuar ?? []),
    ...(ficha.definicoes ?? []),
    ...(ficha.informacoesComplementares ?? []),
  ].filter(Boolean).join('\n');
}

function carregarFichasMbft(): TrechoPeso[] {
  return (fichasMbftJson as FichaMbftPeso[])
    .filter((ficha) => CODIGOS_PESO.has(ficha.codigo))
    .map((ficha) => ({
      id: `mbft-${ficha.codigo}`,
      documento: 'Manual Brasileiro de Fiscalização de Trânsito (MBFT)',
      referencia: `${ficha.codigo}${ficha.amparoLegal ? ` — ${ficha.amparoLegal}` : ''}`,
      pagina: ficha.pagina ?? 1,
      texto: textoFicha(ficha),
      codigo: ficha.codigo,
    }));
}

let cache: TrechoPeso[] | null = null;

/** Acervo embarcado: funciona mesmo sem Supabase ou provedor de IA. */
export function carregarFontesPesos(): TrechoPeso[] {
  if (!cache) cache = [...carregarResolucao(), ...carregarFichasMbft()];
  return cache;
}
