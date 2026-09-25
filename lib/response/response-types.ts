// Response card and related types
import type { Enquadramento, Jurisprudencia } from '@/lib/db/schema';
import type { FichaIA } from '@/lib/rag/ficha-ia';

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
  /** Sheet drafted by AI when the base had nothing; always shown as such. */
  ficha_ia?: FichaIA | null;
  /** "provider · model" that drafted ficha_ia */
  ficha_ia_modelo?: string;
}
