export type EstadoResultadoEstrangeiros = 'confirmada' | 'requer_conferencia' | 'nao_aplicavel';

export interface FatosEstrangeiros {
  paisHabilitacao?: string;
  paisPlaca?: string;
  visitanteOuResidente?: 'visitante' | 'residente';
  dataEntrada?: string;
  habilitacao?: 'valida' | 'vencida' | 'nao_apresentada';
  pidApresentada?: boolean;
  identidadeApresentada?: boolean;
  categoriaCompativel?: boolean;
  registroVeiculo?: 'brasileiro' | 'estrangeiro';
  finalidade?: 'particular' | 'carga' | 'passageiros';
  seguroApresentado?: boolean;
  admissaoTemporariaApresentada?: boolean;
}

export interface InfracaoEstrangeiros {
  codigo: string;
  artigo: string;
  descricao: string;
  condicao: string;
  medida: string;
  fonte: string;
  condicional: true;
}

export interface ResultadoEstrangeiros {
  estado: EstadoResultadoEstrangeiros;
  fatos: FatosEstrangeiros;
  perguntasPendentes: Array<keyof FatosEstrangeiros>;
  documentos: string[];
  baseInternacional: string;
  infracoes: InfracaoEstrangeiros[];
  providencias: string[];
  fontes: Array<{
    titulo: string;
    referencia: string;
    situacao: 'confirmada' | 'revisar';
  }>;
  aviso: string;
}
