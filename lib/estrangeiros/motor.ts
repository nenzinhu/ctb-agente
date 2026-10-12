import type { FatosEstrangeiros, InfracaoEstrangeiros, ResultadoEstrangeiros } from './types';

const PERGUNTAS_ESSENCIAIS: Array<keyof FatosEstrangeiros> = [
  'paisHabilitacao',
  'visitanteOuResidente',
  'dataEntrada',
  'habilitacao',
  'identidadeApresentada',
  'categoriaCompativel',
  'registroVeiculo',
];

const INFRACAO_501: Omit<InfracaoEstrangeiros, 'condicao'> = {
  codigo: '501-00',
  artigo: 'Art. 162, I',
  descricao: 'Dirigir veículo sem possuir CNH, PPD ou ACC — hipótese aplicável ao documento estrangeiro nas condições descritas na ficha.',
  medida: 'Retenção do veículo até a apresentação de condutor habilitado, conforme a ficha MBFT.',
  fonte: 'MBFT 2022, ficha 501-00, itens 12 a 14 do campo “Quando Autuar”.',
  condicional: true,
};

function infracao501(condicao: string): InfracaoEstrangeiros {
  return { ...INFRACAO_501, condicao };
}

export function avaliarEstrangeiro(fatos: FatosEstrangeiros): ResultadoEstrangeiros {
  const perguntasPendentes = PERGUNTAS_ESSENCIAIS.filter((campo) => fatos[campo] === undefined || fatos[campo] === '');
  const infracoes: InfracaoEstrangeiros[] = [];

  if (fatos.habilitacao === 'vencida') {
    infracoes.push(infracao501('Documento de habilitação estrangeiro vencido. Conferir original, validade e sistemas disponíveis.'));
  } else if (fatos.habilitacao === 'nao_apresentada') {
    infracoes.push(infracao501('Condutor estrangeiro sem possuir ou portar documento de habilitação estrangeiro.'));
  }
  if (fatos.categoriaCompativel === false) {
    infracoes.push(infracao501('Categoria do documento estrangeiro diferente da exigida para o veículo.'));
  }
  if (fatos.identidadeApresentada === false) {
    infracoes.push(infracao501('Documento de habilitação estrangeiro desacompanhado de identificação válida do país emissor.'));
  }
  if (fatos.pidApresentada && fatos.habilitacao === 'nao_apresentada') {
    infracoes.push(infracao501('PID apresentada sem o documento de habilitação estrangeiro que deve acompanhá-la.'));
  }

  const documentos = [
    'Documento de habilitação estrangeiro original e dentro da validade.',
    'Documento de identificação válido expedido pelo país de origem da habilitação.',
    'Comprovante da data de entrada no Brasil ou de saída do país de origem.',
  ];
  if (fatos.registroVeiculo === 'estrangeiro') {
    documentos.push('Registro do veículo, seguro aplicável e documento de admissão temporária, quando exigíveis.');
  }

  return {
    estado: 'requer_conferencia',
    fatos,
    perguntasPendentes,
    documentos,
    baseInternacional: 'A lista oficial íntegra de países participantes ainda não foi incorporada; por isso, a participação do país em convenção ou reciprocidade não foi confirmada neste catálogo. Confira o instrumento vigente antes de concluir.',
    infracoes: perguntasPendentes.length > 0 ? [] : infracoes,
    providencias: infracoes.length > 0
      ? ['Confirmar todos os fatos e a vigência da fonte antes de autuar.', INFRACAO_501.medida]
      : ['Conferir a validade dos documentos e o acordo internacional vigente antes de liberar ou adotar medida.'],
    fontes: [{
      titulo: 'Manual Brasileiro de Fiscalização de Trânsito — MBFT 2022',
      referencia: 'Ficha 501-00 · Art. 162, I · itens 12 a 14',
      situacao: 'confirmada',
    }],
    aviso: 'A ferramenta auxilia a conferência. A decisão e o relato da constatação permanecem sob responsabilidade do agente.',
  };
}
