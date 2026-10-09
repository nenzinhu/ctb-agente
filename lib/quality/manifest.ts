import { readFileSync } from 'fs';
import path from 'path';
import { z } from 'zod';
import type { ColecaoQualidade, FonteDocumental } from './types';

export interface FonteLocal extends FonteDocumental {
  colecao: ColecaoQualidade;
  arquivo: string;
}

const FonteLocalSchema = z.object({
  colecao: z.enum(['ctb', 'mbft', 'pop']),
  arquivo: z.string().min(1),
  fonteOficial: z.string().nullable(),
  versao: z.string().nullable(),
  vigenteDesde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  conferidoEm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  situacao: z.enum(['vigente', 'revisar', 'substituido']),
}).strict();

let cache: FonteLocal[] | null = null;

export function validarFontesLocais(input: unknown): FonteLocal[] {
  if (!Array.isArray(input)) throw new Error('Manifesto de fontes inválido: esperada uma lista.');
  const fontes = input.map((registro, indice) => {
    const resultado = FonteLocalSchema.safeParse(registro);
    if (!resultado.success) {
      const id = typeof registro === 'object' && registro && 'colecao' in registro
        ? String(registro.colecao)
        : `posição ${indice + 1}`;
      throw new Error(`Manifesto de fontes inválido no registro "${id}": ${resultado.error.issues[0]?.message}.`);
    }
    return resultado.data;
  });
  const vistas = new Set<ColecaoQualidade>();
  for (const fonte of fontes) {
    if (vistas.has(fonte.colecao)) throw new Error(`Coleção duplicada no manifesto: ${fonte.colecao}.`);
    vistas.add(fonte.colecao);
  }
  for (const colecao of ['ctb', 'mbft', 'pop'] as const) {
    if (!vistas.has(colecao)) throw new Error(`Coleção ausente no manifesto: ${colecao}.`);
  }
  return fontes;
}

export function carregarFontesLocais(): FonteLocal[] {
  if (cache) return cache;
  const arquivo = path.join(process.cwd(), 'data', 'quality', 'sources.json');
  const bruto: unknown = JSON.parse(readFileSync(arquivo, 'utf8'));
  cache = validarFontesLocais(bruto);
  return cache;
}
