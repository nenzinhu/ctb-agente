export type ColecaoQualidade = 'ctb' | 'mbft' | 'pop';
export type EstadoQualidade = 'pronta' | 'atencao' | 'critica';
export type SituacaoFonte = 'vigente' | 'revisar' | 'substituido';

export interface FonteDocumental {
  fonteOficial: string | null;
  versao: string | null;
  vigenteDesde: string | null;
  conferidoEm: string | null;
  situacao: SituacaoFonte;
}

export interface ResultadoCasoBusca {
  casoId: string;
  posicao: number | null;
  duracaoMs: number;
  passou: boolean;
  erro?: string;
}

export interface MetricasBusca {
  total: number;
  hit1: number;
  hit3: number;
  tempoMedioMs: number;
  piorTempoMs: number;
  casos: ResultadoCasoBusca[];
}

export interface MetricasQualidade {
  documentos: number;
  itens: number;
  trechos: number;
  trechosSemVetor: number;
  coberturaVetorial: number | null;
  invalidos: number;
  duplicados: number;
  busca: MetricasBusca;
}

export interface DetalhesQualidade {
  motivos: string[];
  vetoresAplicaveis: boolean;
  buscaSemanticaDisponivel: boolean;
}

export interface DiagnosticoBase {
  id?: string;
  colecao: ColecaoQualidade;
  status: EstadoQualidade;
  fontes: FonteDocumental[];
  metricas: MetricasQualidade;
  detalhes: DetalhesQualidade;
  executadoEm: string;
}
