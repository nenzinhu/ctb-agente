// Build structured response cards
import { supabase } from '@/lib/db/client';
import type { Enquadramento } from '@/lib/db/schema';
import type { CartaoEstruturado } from './response-types';

/**
 * Build a structured response card for an enforcement code
 * Queries database for infraction details and generates supporting content
 * @param codigoMBFT - MBFT enforcement code (e.g., "516-91")
 * @param retrievedChunks - Relevant legal text chunks retrieved from search
 * @returns Structured response card
 */
export async function buildCard(
  codigoMBFT: string,
  retrievedChunks: any[]
): Promise<CartaoEstruturado> {
  const { data: enquadramento, error } = await supabase
    .from('enquadramentos')
    .select('*')
    .eq('codigo_mbft', codigoMBFT)
    .single();

  if (error || !enquadramento) {
    return {
      tipo: 'enquadramento',
      sucesso: false,
      enquadramento: null,
      checklist_ait: [],
      erros_comuns: [],
      concurso_infrações: [],
      crime_transito: false,
      categoria_cnh_exigida: 'desconhecida',
      normas_relacionadas: [],
      jurisprudencia: [],
      explicacao_simples: 'Enquadramento não encontrado.',
      exemplo_dia_a_dia: '',
      citacoes: [],
    };
  }

  return {
    tipo: 'enquadramento',
    sucesso: true,
    enquadramento,
    checklist_ait: generateChecklistAIT(codigoMBFT),
    erros_comuns: generateErrosComuns(codigoMBFT),
    concurso_infrações: [],
    crime_transito: checkCrimeTransito(enquadramento),
    categoria_cnh_exigida: getCategoriaCNH(codigoMBFT),
    normas_relacionadas: [],
    jurisprudencia: [],
    explicacao_simples: '',
    exemplo_dia_a_dia: '',
    citacoes: extractCitations(retrievedChunks),
  };
}

/**
 * Generate AIT (Auto de Infração de Trânsito) checklist items
 * @param _codigo - MBFT code
 * @returns Array of checklist items
 */
function generateChecklistAIT(_codigo: string): string[] {
  // TODO: Create a mapping of código → checklist items
  return [
    '[ ] Descrever a conduta exata',
    '[ ] Anotar hora e data',
    '[ ] Fotografar evidências',
  ];
}

/**
 * Generate common mistakes for this violation
 * @param _codigo - MBFT code
 * @returns Array of common mistake descriptions
 */
function generateErrosComuns(_codigo: string): string[] {
  // TODO: Create a mapping of código → common mistakes
  return ['❌ NÃO fazer X', '⚠️ Cuidado com Y'];
}

/**
 * Check if this infraction might constitute a traffic crime
 * @param enquadramento - Infraction details
 * @returns True if gravíssima (gravest level)
 */
function checkCrimeTransito(enquadramento: Enquadramento): boolean {
  return enquadramento.gravidade === 'gravíssima';
}

/**
 * Get driver's license category required for violation
 * @param _codigo - MBFT code
 * @returns CNH category string
 */
function getCategoriaCNH(_codigo: string): string {
  // TODO: Create a mapping of código → CNH category
  return 'qualquer';
}

/**
 * Extract citations from retrieved chunks
 * @param chunks - Retrieved legal text chunks
 * @returns Array of citations
 */
function extractCitations(chunks: any[]) {
  return chunks.map((c) => ({
    trecho: c.texto.substring(0, 100) + '...',
    dispositivo: c.numero_dispositivo,
    validada: true,
  }));
}
