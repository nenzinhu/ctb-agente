// Response card and related types
import type { Enquadramento } from '@/lib/db/schema';

/**
 * Citation object within a response
 */
export interface ResponseCitation {
  trecho: string;
  dispositivo: string;
  validada: boolean;
}

/**
 * Structured response card for enforcement situations
 */
export interface CartaoEstruturado {
  tipo: 'enquadramento';
  sucesso: boolean;
  enquadramento: Enquadramento | null;
  checklist_ait: string[];
  erros_comuns: string[];
  concurso_infrações: string[];
  crime_transito: boolean;
  categoria_cnh_exigida: string;
  normas_relacionadas: string[];
  jurisprudencia: any[];
  explicacao_simples: string;
  exemplo_dia_a_dia: string;
  citacoes: ResponseCitation[];
}
