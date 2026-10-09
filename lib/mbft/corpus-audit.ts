import type { Enquadramento } from '@/lib/db/schema';
import type { FichaMbft } from './parser';

export const SEED_EXAMPLE_CODES = ['516-91', '517-32', '745-52', '737-19', '678-12'] as const;

export type CampoComparavel = 'descricao' | 'gravidade' | 'pontos' | 'amparo_legal';

export interface EnquadramentoDivergencia {
  codigo: string;
  campo: CampoComparavel;
  banco: string | number;
  mbft: string | number;
}

export interface EnquadramentoAuditItem {
  codigo: string;
  fichaEncontrada: boolean;
  exemploSeed: boolean;
  divergencias: EnquadramentoDivergencia[];
  revisaoHumana: string[];
}

export interface EnquadramentoAuditReport {
  totalBanco: number;
  totalMbft: number;
  duplicados: string[];
  itens: EnquadramentoAuditItem[];
}

function normalizar(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/\bdo\s+ctb\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function pontosInequivocos(value: string): number | null {
  if (/nao\s+(computavel|aplicavel)/.test(normalizar(value))) return null;
  const numeros = value.match(/\d+/g) ?? [];
  if (numeros.length !== 1) return null;
  return Number(numeros[0]);
}

function compararTexto(
  item: EnquadramentoAuditItem,
  campo: Extract<CampoComparavel, 'descricao' | 'gravidade' | 'amparo_legal'>,
  banco: string,
  mbft: string
): void {
  if (normalizar(banco) !== normalizar(mbft)) {
    item.divergencias.push({ codigo: item.codigo, campo, banco, mbft });
  }
}

export function auditEnquadramentos(
  enquadramentos: Enquadramento[],
  fichas: FichaMbft[]
): EnquadramentoAuditReport {
  const fichasPorCodigo = new Map(fichas.map((ficha) => [ficha.codigo, ficha]));
  const frequencia = new Map<string, number>();
  for (const item of enquadramentos) {
    frequencia.set(item.codigo_mbft, (frequencia.get(item.codigo_mbft) ?? 0) + 1);
  }

  const itens = enquadramentos.map((enquadramento): EnquadramentoAuditItem => {
    const codigo = enquadramento.codigo_mbft.trim();
    const ficha = fichasPorCodigo.get(codigo);
    const item: EnquadramentoAuditItem = {
      codigo,
      fichaEncontrada: Boolean(ficha),
      exemploSeed: SEED_EXAMPLE_CODES.includes(codigo as (typeof SEED_EXAMPLE_CODES)[number]),
      divergencias: [],
      revisaoHumana: ['valor_multa'],
    };
    if (!ficha) return item;

    compararTexto(item, 'descricao', enquadramento.descricao, ficha.tipificacaoResumida);
    compararTexto(item, 'gravidade', enquadramento.gravidade, ficha.gravidade);
    compararTexto(item, 'amparo_legal', enquadramento.amparo_legal, ficha.amparoLegal);
    const pontos = pontosInequivocos(ficha.pontuacao);
    if (pontos === null) item.revisaoHumana.push('pontos');
    else if (enquadramento.pontos !== pontos) {
      item.divergencias.push({ codigo, campo: 'pontos', banco: enquadramento.pontos, mbft: pontos });
    }
    return item;
  });

  return {
    totalBanco: enquadramentos.length,
    totalMbft: fichas.length,
    duplicados: [...frequencia].filter(([, count]) => count > 1).map(([codigo]) => codigo).sort(),
    itens,
  };
}
