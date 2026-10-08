// Documents bundled with the app (data/acervo), indexed on demand from the
// panel. The CTB text is public domain (Lei 9.610/98, art. 8º, IV), so it can
// ship in the repository; restricted material (e.g. POPs) goes through the
// upload form instead.
import * as fs from 'fs';
import * as path from 'path';
import type { Colecao } from './documents';
import type { TipoNorma } from './indexar';
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
  paginas: number;
  fonte?: string;
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
