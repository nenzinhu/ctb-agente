import { SISTEMA_PORTUGUES_BR } from '@/lib/ai/portugues';
import { ProviderChain } from '@/lib/ai/providers/chain';
import { buscarNoIndice, criarIndiceBusca } from '@/lib/search/lexical';
import { normalizarBusca } from '@/lib/search/sinonimos';

import { carregarFontesPesos, type TrechoPeso } from './fontes';

export type { TrechoPeso } from './fontes';

export interface RespostaPeso {
  resposta: string;
  fontes: TrechoPeso[];
  origem: 'ia' | 'fontes-oficiais';
  provedor?: string;
  modelo?: string;
}

const fontes = carregarFontesPesos();
const indice = criarIndiceBusca(fontes.map((trecho) => ({
  item: trecho,
  titulo: `${trecho.referencia} ${trecho.codigo ?? ''}`,
  corpo: trecho.texto,
  campos: [{ texto: trecho.documento, peso: 1.2 }],
})));

function consultaOperacional(consulta: string): string {
  const texto = normalizarBusca(consulta);
  if (/nota|documento fiscal/.test(texto) && /sem|ausen|nao/.test(texto) && /kg|peso/.test(texto)) {
    return 'documento fiscal ausência peso kg pesagem documento substituto';
  }
  if (/carreta|cavalo/.test(texto)) return 'PBTC caminhão trator semirreboque peso combinado';
  if (/5\s*(?:%|por cento)|cinco por cento/.test(texto)) return 'tolerância PBT PBTC equipamento pesagem';
  if (/tandem/.test(texto)) return 'peso bruto conjunto eixos tandem';
  if (/quem|respons|infrator/.test(texto) && /embarcador|transportador/.test(texto)) {
    return 'infrator responsabilidade embarcador transportador excesso peso';
  }
  if (/cmt|capacidade maxima de tracao/.test(texto) && /mil|1000|1\.000|acima/.test(texto)) {
    return 'CMT acima 1000 excesso infração gravíssima';
  }
  return consulta;
}

export function buscarTrechosPesos(consulta: string, limite = 5): TrechoPeso[] {
  const texto = consulta.trim().slice(0, 500);
  if (!texto || limite <= 0) return [];
  return buscarNoIndice(consultaOperacional(texto), indice, Math.min(8, limite));
}

export function montarContextoPesos(trechos: TrechoPeso[]): string {
  return trechos.map((trecho, indice) => [
    `[FONTE ${indice + 1}] ${trecho.documento} — ${trecho.referencia} — p. ${trecho.pagina}`,
    trecho.texto,
  ].join('\n')).join('\n\n');
}

function respostaOficial(trechos: TrechoPeso[]): string {
  if (trechos.length === 0) {
    return 'Não encontrei trecho oficial suficiente para responder com segurança. Refine a pergunta ou informe a configuração do veículo.';
  }
  const extratos = trechos.slice(0, 3).map((trecho) => {
    const texto = trecho.texto.replace(/\s+/g, ' ').trim();
    const resumo = texto.length > 650 ? `${texto.slice(0, 647)}…` : texto;
    return `${resumo} (${trecho.documento}, ${trecho.referencia}, p. ${trecho.pagina})`;
  });
  return `Trechos oficiais aplicáveis:\n\n${extratos.join('\n\n')}`;
}

export async function explicarPesos(consulta: string): Promise<RespostaPeso> {
  const trechos = buscarTrechosPesos(consulta, 5);
  if (trechos.length === 0) return { resposta: respostaOficial(trechos), fontes: [], origem: 'fontes-oficiais' };

  const prompt = [
    SISTEMA_PORTUGUES_BR,
    'Você auxilia um agente de campo sobre pesos e dimensões de veículos.',
    'Responda de forma objetiva e didática, usando exclusivamente as fontes fornecidas.',
    'Não invente limites, códigos, valores ou providências. Se faltarem dados, diga exatamente quais são.',
    'Cite cada conclusão no formato [Fonte N]. Diferencie limite legal, limite técnico e tolerância de fiscalização.',
    '',
    `PERGUNTA: ${consulta.trim().slice(0, 500)}`,
    '',
    montarContextoPesos(trechos),
  ].join('\n');

  try {
    const gerada = await new ProviderChain().generateRapido(prompt, 700, 0.1);
    return {
      resposta: gerada.texto.trim(),
      fontes: trechos,
      origem: 'ia',
      provedor: gerada.provedor,
      modelo: gerada.modelo,
    };
  } catch (erro) {
    console.warn('IA de pesos indisponível; usando apenas os trechos oficiais.', erro);
    return { resposta: respostaOficial(trechos), fontes: trechos, origem: 'fontes-oficiais' };
  }
}
