export interface Dispositivo {
  id: string;
  numero_dispositivo: string; // "art. 165 § 1º"
  texto: string;
  norma_id: string;
  tipo: 'lei' | 'resolucao' | 'portaria' | 'jurisprudencia' | 'manual';
  data_publicacao: string; // ISO date
  data_vigencia_inicio: string;
  data_vigencia_fim: string | null;
  embedding: number[]; // pgvector (1024 dims — mistral-embed)
  tsvector_pt: string; // tsvector in Portuguese
  citacoes_dentro: string[]; // ["art. 270", "Res. 432/2013"]
  criado_em: string;
  atualizado_em: string;
}

export interface Enquadramento {
  id: string;
  codigo_mbft: string; // "516-91"
  desdobramento: number; // 0, 1, 2, ...
  descricao: string; // "Estacionar em local proibido"
  gravidade: 'leve' | 'média' | 'grave' | 'gravíssima';
  pontos: number;
  valor_multa: number;
  unidade: string; // "UIRF", "UFIR"
  retem_veiculo: boolean;
  remove_veiculo: boolean;
  recolhe_documento: 'cnh' | 'crlv' | 'ambos' | null;
  amparo_legal: string; // "art. 181 XVII do CTB"
  medida_administrativa: string;
  responsavel: 'condutor' | 'proprietario' | 'ambos';
  criado_em: string;
}

export interface CacheResposta {
  id: string;
  hash_pergunta: string;
  pergunta_original: string;
  resposta_completa: Record<string, unknown>; // Full response JSON
  modelo_usado: string;
  tempo_geracao_ms: number;
  citacoes_validadas: boolean;
  data_criacao: string;
  data_ultimo_acesso: string;
  ttl_dias: number;
}

export interface UsoDiario {
  id: string;
  ip_endereco: string;
  timestamp: string;
  tipo_consulta: 'codigo' | 'artigo' | 'situacao';
  cache_hit: boolean;
  modelo_ia_usado: string;
  sucesso: boolean;
  tempo_ms: number;
}

export interface Remissao {
  id: string;
  origem_dispositivo_id: string;
  destino_dispositivo_id: string;
  tipo: 'remete' | 'revoga' | 'altera';
  criado_em: string;
}

export interface Jurisprudencia {
  id: string;
  tipo: 'stj' | 'tj' | 'cetran' | 'jari';
  numero: string;
  ementa: string;
  resumo: string;
  data_decisao: string;
  tema: string;
  dispositivos_relacionados: string[];
  link_oficial: string;
  criado_em: string;
}
