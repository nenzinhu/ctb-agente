import type { Colecao } from '@/lib/ingestion/documents';
import type { SituacaoFonte } from '@/lib/quality/types';

export type PublicoApostila = 'agente' | 'leigo';

export interface IntervaloPagina {
  inicio: number;
  fim: number;
}

export interface SelecaoPaginasNormalizada {
  paginas: number[];
  intervalos: IntervaloPagina[];
  canonico: string;
}

export type SelecaoApostila =
  | { modo: 'inteiro' }
  | { modo: 'paginas'; intervalos: string };

export interface DocumentoApostila {
  id: string;
  titulo: string;
  colecao: Colecao;
  paginas: number | null;
  paginaMaximaDisponivel: number | null;
  trechos: number;
  situacao: Extract<SituacaoFonte, 'vigente' | 'revisar'>;
}

export interface DocumentoApostilaInterno extends DocumentoApostila {
  hashConteudo: string;
}

export interface TrechoApostila {
  id: string;
  documentoId: string;
  secao: string | null;
  pagina: number | null;
  ordem: number;
  texto: string;
}

export interface ParteApostila {
  indice: number;
  texto: string;
  paginas: number[];
  secoes: string[];
}

export interface CapituloApostila {
  id: string;
  titulo: string;
  texto: string;
  paginas: number[];
  situacao: Extract<SituacaoFonte, 'vigente' | 'revisar'>;
  modelo: string | null;
}

