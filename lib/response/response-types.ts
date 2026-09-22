// Response card and related types
import type { Enquadramento, Jurisprudencia } from '@/lib/db/schema';

/**
 * Citation object within a response
 */
export interface ResponseCitation {
  trecho: string;
  dispositivo: string;
  validada: boolean;
}

/**
 * Legal provision applied to a consultation, already retrieved from the database
 */
export interface NormaAplicavel {
  numero_dispositivo: string;
  texto: string;
  norma_id: string;
  tipo: string;
  vigente: boolean;
}

/**
 * How the query was classified by the router
 */
export type TipoConsulta = 'codigo' | 'artigo' | 'situacao';

/**
 * Structured response card for enforcement situations
 */
export interface CartaoEstruturado {
  tipo: TipoConsulta;
  sucesso: boolean;
  consulta: string;
  enquadramento: Enquadramento | null;
  normas: NormaAplicavel[];
  checklist_ait: string[];
  erros_comuns: string[];
  /** Códigos MBFT que podem ser cumulados com este enquadramento. */
  concurso_infracoes: string[];
  crime_transito: boolean;
  categoria_cnh_exigida: string;
  normas_relacionadas: string[];
  jurisprudencia: Jurisprudencia[];
  explicacao_simples: string;
  exemplo_dia_a_dia: string;
  citacoes: ResponseCitation[];
  cache_hit: boolean;
  tempo_ms: number;
}
