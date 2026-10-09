import type { EstadoQualidade, FonteDocumental, MetricasBusca } from './types';

export const MIN_HIT_1 = 90;
export const MIN_HIT_3 = 100;
export const MAX_LATENCIA_CASO_MS = 1500;

export interface AvaliacaoProntidao {
  fontes: FonteDocumental[];
  documentos: number;
  itens: number;
  trechos: number;
  trechosSemVetor: number;
  vetoresAplicaveis: boolean;
  buscaSemanticaDisponivel: boolean;
  invalidos: number;
  duplicados: number;
  busca: MetricasBusca;
}

export interface ResultadoProntidao {
  status: EstadoQualidade;
  motivos: string[];
}

function naoInformado(valor: string | null): boolean {
  return !valor?.trim() || valor.trim().toLocaleLowerCase('pt-BR') === 'não informado';
}

export function avaliarProntidao(input: AvaliacaoProntidao): ResultadoProntidao {
  const motivosCriticos: string[] = [];
  const motivosAtencao: string[] = [];

  if (input.itens <= 0 || input.trechos <= 0) motivosCriticos.push('A base está vazia ou não possui trechos consultáveis.');
  if (input.invalidos > 0) motivosCriticos.push(`${input.invalidos} item(ns) apresentam leitura ou estrutura inválida.`);
  if (input.duplicados > 0) motivosCriticos.push(`${input.duplicados} item(ns) duplicados comprometem a integridade da base.`);

  const fontePendente = input.fontes.length === 0 || input.fontes.some((fonte) =>
    naoInformado(fonte.fonteOficial)
    || naoInformado(fonte.versao)
    || !fonte.vigenteDesde
    || !fonte.conferidoEm
    || fonte.situacao !== 'vigente'
  );
  if (fontePendente) motivosAtencao.push('Há metadados oficiais incompletos ou fonte pendente de revisão.');
  if (input.documentos > input.fontes.length) motivosAtencao.push('Existem documentos sem metadados oficiais associados.');

  if (input.vetoresAplicaveis && !input.buscaSemanticaDisponivel) {
    motivosAtencao.push('Busca textual pronta; busca semântica indisponível.');
  } else if (input.vetoresAplicaveis && input.trechosSemVetor > 0) {
    motivosAtencao.push(`${input.trechosSemVetor} trecho(s) ainda não possuem vetor semântico.`);
  }

  if (input.busca.total <= 0) motivosAtencao.push('Nenhuma consulta de referência foi executada.');
  if (input.busca.hit3 < MIN_HIT_3) motivosAtencao.push(`Hit@3 abaixo de ${MIN_HIT_3}%.`);
  if (input.busca.hit1 < MIN_HIT_1) motivosAtencao.push(`Hit@1 abaixo de ${MIN_HIT_1}%.`);
  if (input.busca.piorTempoMs > MAX_LATENCIA_CASO_MS) {
    motivosAtencao.push(`Há consulta textual acima de ${MAX_LATENCIA_CASO_MS.toLocaleString('pt-BR')} ms.`);
  }

  const motivos = [...motivosCriticos, ...motivosAtencao];
  if (motivosCriticos.length > 0) return { status: 'critica', motivos };
  if (motivosAtencao.length > 0) return { status: 'atencao', motivos };
  return { status: 'pronta', motivos: [] };
}
