// Documents bundled with the app (data/acervo), indexed on demand from the
// panel. The CTB text is public domain (Lei 9.610/98, art. 8º, IV), so it can
// ship in the repository; restricted material (e.g. POPs) goes through the
// upload form instead.
import * as fs from 'fs';
import * as path from 'path';
import type { Colecao } from './documents';
import type { TipoNorma } from './indexar';
import type { SituacaoFonte } from '@/lib/quality/types';
import { convertReadablePageMarkers } from './plain-text';

export interface ItemAcervo {
  id: string;
  titulo: string;
  descricao: string;
  /** Path relative to the project root (traced into the function by next.config.ts). */
  arquivo: string;
  colecao: Colecao;
  normaId?: string;
  documentType?: TipoNorma;
  dataPublicacao?: string;
  dataVigenciaInicio?: string;
  paginas: number;
  fonte?: string;
  fonteOficial?: string;
  versao?: string;
  vigenteDesde?: string;
  conferidoEm?: string;
  situacao?: SituacaoFonte;
}

export const ACERVO: ItemAcervo[] = [
  {
    id: 'ctb-lei-9503-compilado',
    titulo: 'Código de Trânsito Brasileiro — Lei nº 9.503/1997 (compilado)',
    descricao:
      'Texto compilado do Planalto com as alterações posteriores e o Anexo I (conceitos e definições). Base das consultas de legislação.',
    arquivo: 'data/acervo/ctb-lei-9503-compilado.txt',
    colecao: 'ctb',
    normaId: 'ctb',
    documentType: 'lei',
    paginas: 93,
    fonte: 'https://www.planalto.gov.br/ccivil_03/leis/l9503compilado.htm',
  },
  {
    id: 'fatos-pmsc-mobile',
    titulo: 'Lista de Fatos (PMSC Mobile)',
    descricao: '510 naturezas com grupo e potencial ofensivo, conforme a lista atualizada em 10/06/2019.',
    arquivo: 'data/acervo/fatos-pmsc-mobile.txt',
    colecao: 'natureza_potencial',
    paginas: 23,
    fonteOficial: 'PMSC Mobile',
    versao: 'Lista atualizada em 10/06/2019',
    vigenteDesde: '2019-06-10',
    conferidoEm: '2026-10-10',
    situacao: 'vigente',
  },
  {
    id: 'resolucao-contran-882-2021',
    titulo: 'Resolução CONTRAN nº 882/2021 — pesos e dimensões',
    descricao:
      'Limites de pesos e dimensões, fiscalização de PBT/PBTC, excesso de peso e inscrições obrigatórias dos veículos.',
    arquivo: 'data/acervo/resolucao-contran-882-2021.txt',
    colecao: 'ctb',
    normaId: 'contran-res-882-2021',
    documentType: 'resolucao',
    dataPublicacao: '2021-12-24T00:00:00.000Z',
    dataVigenciaInicio: '2022-01-03T00:00:00.000Z',
    paginas: 27,
    fonte:
      'https://www.in.gov.br/en/web/dou/-/resolucao-contran-n-882-de-13-de-dezembro-de-2021-370017699',
    fonteOficial:
      'https://www.in.gov.br/en/web/dou/-/resolucao-contran-n-882-de-13-de-dezembro-de-2021-370017699',
    versao: 'Publicada no DOU em 24/12/2021',
    vigenteDesde: '2022-01-03',
    conferidoEm: '2026-10-10',
    situacao: 'vigente',
  },
];

/**
 * @returns The item's text with the chunker's page markers
 */
export function lerAcervo(item: ItemAcervo): string {
  const bruto = fs.readFileSync(path.join(process.cwd(), item.arquivo), 'utf-8');
  return convertReadablePageMarkers(bruto);
}

/** File name the item is registered under (re-indexing replaces it). */
export function nomeArquivoAcervo(item: ItemAcervo): string {
  return path.basename(item.arquivo);
}
