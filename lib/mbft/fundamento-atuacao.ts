import type { FichaMbft } from './parser';

export type FonteEvidencia = 'quando_autuar' | 'quando_nao_autuar';
export type RespostaEvidencia = 'sim' | 'nao';

export interface EvidenciaFundamento {
  criterio: string;
  fonte: FonteEvidencia;
  resposta: RespostaEvidencia;
  efeito: 'favoravel' | 'contraria';
  descricao: string;
}

export interface PendenciaFundamento {
  criterio: string;
  fonte: FonteEvidencia;
}

export interface FundamentoAtuacao {
  codigo: string;
  fatoConstatado: string;
  amparoLegal: string;
  responsavel: string;
  gravidade: string;
  pontuacao: string;
  penalidade: string;
  medidaAdministrativa: string;
  constatacao: string;
  elementosConfirmados: string[];
  elementosAConfirmar: string[];
  divergencias: string[];
  fonte: string;
  aptoParaConferenciaFinal: boolean;
  texto: string;
}

function limparCriterio(texto: string): string {
  return texto.replace(/^\s*\d+\s*[.)-]\s*/, '').replace(/\s+/g, ' ').trim();
}

function chaveCriterio(texto: string): string {
  return limparCriterio(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Builds a review draft exclusively from the selected official MBFT sheet.
 * It does not infer facts or choose an infraction for the agent.
 */
export function montarFundamentoAtuacao(
  ficha: FichaMbft,
  dados: { evidencias: EvidenciaFundamento[]; pendentes: PendenciaFundamento[] }
): FundamentoAtuacao {
  const cenarioAplicavelConfirmado = dados.evidencias.some(
    (evidencia) => evidencia.fonte === 'quando_autuar' && evidencia.resposta === 'sim'
  );
  const elementosConfirmados = dados.evidencias
    .filter((evidencia) => evidencia.efeito === 'favoravel')
    .map((evidencia) => evidencia.descricao.trim())
    .filter(Boolean);
  const divergencias = dados.evidencias
    .filter((evidencia) => evidencia.efeito === 'contraria')
    .filter((evidencia) => !(
      cenarioAplicavelConfirmado
      && evidencia.fonte === 'quando_autuar'
      && evidencia.resposta === 'nao'
    ))
    .map((evidencia) => evidencia.descricao.trim())
    .filter(Boolean);
  const elementosAConfirmar: string[] = [];
  if (!cenarioAplicavelConfirmado) {
    const cenariosPendentes = dados.pendentes.filter((pendencia) => pendencia.fonte === 'quando_autuar');
    if (cenariosPendentes.length) {
      elementosAConfirmar.push(...cenariosPendentes.map(
        (pendencia) => `Confirme se: ${limparCriterio(pendencia.criterio)}`
      ));
    } else if (ficha.quandoAutuar.length) {
      elementosAConfirmar.push('Confirme na ficha qual cenário de “Quando autuar” corresponde ao fato observado.');
    }
  }
  const exclusoes = [...ficha.quandoNaoAutuar, ...dados.pendentes
    .filter((pendencia) => pendencia.fonte === 'quando_nao_autuar')
    .map((pendencia) => pendencia.criterio)]
    .map(limparCriterio)
    .filter((criterio, indice, lista) => criterio && lista.findIndex(
      (item) => chaveCriterio(item) === chaveCriterio(criterio)
    ) === indice);
  for (const exclusao of exclusoes) {
    const respondida = dados.evidencias.some(
      (evidencia) => evidencia.fonte === 'quando_nao_autuar'
        && chaveCriterio(evidencia.criterio) === chaveCriterio(exclusao)
    );
    if (!respondida) {
      elementosAConfirmar.push(`Confirme se a hipótese de não autuar ocorre: ${exclusao}`);
    }
  }
  const fonte = `MBFT — ficha ${ficha.codigo}, página ${ficha.pagina}`;
  const fundamento = {
    codigo: ficha.codigo,
    fatoConstatado: ficha.tipificacao || ficha.tipificacaoResumida,
    amparoLegal: ficha.amparoLegal,
    responsavel: ficha.infrator,
    gravidade: ficha.gravidade,
    pontuacao: ficha.pontuacao,
    penalidade: ficha.penalidade,
    medidaAdministrativa: ficha.medidaAdministrativa,
    constatacao: ficha.constatacao,
    elementosConfirmados,
    elementosAConfirmar,
    divergencias,
    fonte,
    aptoParaConferenciaFinal:
      cenarioAplicavelConfirmado && elementosAConfirmar.length === 0 && divergencias.length === 0,
  };
  const listar = (itens: string[]) => itens.length ? itens.map((item) => `- ${item}`).join('\n') : '- Nenhum';
  const texto = [
    'FUNDAMENTO DA ATUAÇÃO — PARA CONFERÊNCIA HUMANA',
    `Fato constatado: ${fundamento.fatoConstatado}`,
    `Código MBFT: ${fundamento.codigo}`,
    `Amparo legal: ${fundamento.amparoLegal}`,
    `Responsável: ${fundamento.responsavel}`,
    `Gravidade e pontuação: ${fundamento.gravidade} · ${fundamento.pontuacao}`,
    `Penalidade: ${fundamento.penalidade}`,
    `Medida administrativa: ${fundamento.medidaAdministrativa}`,
    `Constatação: ${fundamento.constatacao}`,
    'Elementos confirmados:',
    listar(elementosConfirmados),
    'Elementos a confirmar:',
    listar(elementosAConfirmar),
    'Divergências:',
    listar(divergencias),
    `Fonte: ${fonte}`,
    'Aviso: minuta de apoio. Confira a ficha e a norma vigentes antes de lavrar o AIT.',
  ].join('\n');

  return { ...fundamento, texto };
}
