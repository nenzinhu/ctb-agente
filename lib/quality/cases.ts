import { readFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { ColecaoQualidade } from './types';

export interface CasoBusca {
  id: string;
  colecao: ColecaoQualidade;
  consulta: string;
  categoria: 'codigo' | 'artigo' | 'frase' | 'abreviacao' | 'fragmento' | 'erro' | 'sinonimo' | 'giria';
  esperados: string[];
  comparacao: 'exata' | 'prefixo';
  maxPosicao: 1 | 3;
}

const CasoBuscaSchema = z.object({
  id: z.string().min(1),
  colecao: z.enum(['ctb', 'mbft', 'pop']),
  consulta: z.string().min(1),
  categoria: z.enum(['codigo', 'artigo', 'frase', 'abreviacao', 'fragmento', 'erro', 'sinonimo', 'giria']),
  esperados: z.array(z.string().min(1)).min(1),
  comparacao: z.enum(['exata', 'prefixo']),
  maxPosicao: z.union([z.literal(1), z.literal(3)]),
}).strict();

let cache: CasoBusca[] | null = null;

export function validarCasosBusca(input: unknown): CasoBusca[] {
  if (!Array.isArray(input)) throw new Error('Casos de busca inválidos: esperada uma lista.');
  const casos = input.map((registro, indice) => {
    const resultado = CasoBuscaSchema.safeParse(registro);
    if (!resultado.success) {
      const id = typeof registro === 'object' && registro && 'id' in registro
        ? String(registro.id)
        : `posição ${indice + 1}`;
      throw new Error(`Caso de busca inválido no registro "${id}": ${resultado.error.issues[0]?.message}.`);
    }
    return resultado.data;
  });
  const ids = new Set<string>();
  for (const caso of casos) {
    if (ids.has(caso.id)) throw new Error(`Caso duplicado no conjunto de referência: ${caso.id}.`);
    ids.add(caso.id);
  }
  return casos;
}

export function carregarCasosBusca(): CasoBusca[] {
  if (cache) return cache;
  const arquivo = path.join(process.cwd(), 'data', 'quality', 'search-cases.json');
  const bruto: unknown = JSON.parse(readFileSync(arquivo, 'utf8'));
  cache = validarCasosBusca(bruto);
  return cache;
}
