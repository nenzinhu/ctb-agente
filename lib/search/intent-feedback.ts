import { createHash } from 'node:crypto';
import { filterPII } from '@/lib/query/pii-filter';
import type { ClassificacaoDominio, DominioConsulta } from './intent-specialist';

export interface ResultadoIntencao {
  tipo: 'artigo_ctb' | 'ficha_mbft' | 'pop' | 'fato_pmsc' | 'nenhum';
  id: string;
}

export interface ExemploIntencao {
  consultaAnonimizada: string;
  hashConsulta: string;
  dominioPrevisto: DominioConsulta;
  confianca: number;
  fonte: ClassificacaoDominio['fonte'];
  modelo: string | null;
  sinais: string[];
  resultados: ResultadoIntencao[];
}

export interface EntradaExemploIntencao {
  consulta: string;
  classificacao: ClassificacaoDominio;
  resultados?: ResultadoIntencao[];
  /** Aceito na borda para impedir que integrações o incluam no retorno. */
  ip?: string;
}

export function anonimizarConsultaIntencao(consulta: string): string {
  return filterPII(consulta)
    .replace(/\bRG\s*[:º-]?\s*\d{1,2}\.?\d{3}\.?\d{3}-?[\dX]\b/gi, 'RG [RG]')
    .replace(/\b(?:rua|avenida|av\.?|travessa|alameda|rodovia)\s+[^,;]+(?:,\s*\d+[A-Za-z]?)?/giu, '[ENDERECO]')
    .replace(/\b([\p{Lu}][\p{L}'-]+(?:\s+[\p{Lu}][\p{L}'-]+)+)(?=\s+(?:CPF|CNH|telefone|e-?mail)\b)/giu, '[PESSOA]')
    .replace(/\b[\p{L}'-]+(?:\s+(?:(?:d[aeo]s?|e)\s+)?[\p{L}'-]+)+(?=\s+(?:foi|estava|dirigia|conduzia|trafegava|mora|reside)\b)/giu, '[PESSOA]')
    .replace(/\b[\p{Lu}][\p{Ll}'-]+(?:\s+(?:(?:d[aeo]s?|e)\s+)?[\p{Lu}][\p{Ll}'-]+)+\b/gu, '[PESSOA]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]')
    .replace(/(?<!\d)(?:\+?55\s*)?(?:(?:\(\d{2}\)|\d{2})\s*)?9?\d{4}[-\s]?\d{4}(?!\d)/g, '[TELEFONE]')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]')
    .replace(/(?<![A-F0-9:])[A-F0-9]{1,4}(?::[A-F0-9]{0,4}){2,7}(?![A-F0-9:])/gi, '[IP]')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Monta apenas os campos permitidos na futura base supervisionada. */
export function prepararExemploIntencao(entrada: EntradaExemploIntencao): ExemploIntencao {
  const consultaAnonimizada = anonimizarConsultaIntencao(entrada.consulta);
  const hashConsulta = createHash('sha256').update(consultaAnonimizada.toLowerCase()).digest('hex');
  return {
    consultaAnonimizada,
    hashConsulta,
    dominioPrevisto: entrada.classificacao.dominio,
    confianca: entrada.classificacao.confianca,
    fonte: entrada.classificacao.fonte,
    modelo: entrada.classificacao.modelo ?? null,
    sinais: [...entrada.classificacao.sinais],
    resultados: [...(entrada.resultados ?? [])],
  };
}
