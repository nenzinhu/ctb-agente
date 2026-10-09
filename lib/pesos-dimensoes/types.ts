export interface FontePeso {
  documento: string;
  artigo: string;
  pagina: number;
  url?: string;
}

export type TipoGrupoEixo =
  | 'isolado-2-pneus'
  | 'isolado-4-pneus'
  | 'direcional-duplo'
  | 'tandem-duplo'
  | 'tandem-triplo'
  | 'distanciado'
  | 'conforme-aet';

export interface GrupoEixo {
  id: string;
  nome: string;
  tipo: TipoGrupoEixo;
  quantidadeEixos: number;
  limiteKg: number | null;
}

export interface ConfiguracaoVeiculo {
  id: string;
  nome: string;
  codigo: string;
  apelidos: string[];
  unidades: number;
  quantidadeEixos: number;
  comprimentoMinimoM: number | null;
  comprimentoMaximoM: number | null;
  limiteTotalKg: number | null;
  requerAet: boolean;
  observacao?: string;
  gruposEixo: GrupoEixo[];
  fontes: FontePeso[];
}
