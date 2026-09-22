-- Create pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create dispositivos table
CREATE TABLE dispositivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_dispositivo TEXT NOT NULL UNIQUE,
  texto TEXT NOT NULL,
  norma_id TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('lei', 'resolucao', 'portaria', 'jurisprudencia', 'manual')),
  data_publicacao DATE,
  data_vigencia_inicio DATE NOT NULL,
  data_vigencia_fim DATE,
  embedding VECTOR(1024), -- mistral-embed output size (lib/ai/providers/mistral.ts)
  tsvector_pt TSVECTOR GENERATED ALWAYS AS (
    to_tsvector('portuguese', texto)
  ) STORED,
  citacoes_dentro TEXT[] DEFAULT '{}',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dispositivos_numero ON dispositivos USING BTREE (numero_dispositivo);
CREATE INDEX idx_dispositivos_tsvector_pt ON dispositivos USING GIN (tsvector_pt);
CREATE INDEX idx_dispositivos_embedding ON dispositivos USING IVFFlat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_dispositivos_vigencia ON dispositivos (data_vigencia_inicio, data_vigencia_fim);

-- Create enquadramentos table
CREATE TABLE enquadramentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_mbft TEXT NOT NULL UNIQUE,
  desdobramento INT NOT NULL DEFAULT 0,
  descricao TEXT NOT NULL,
  gravidade TEXT NOT NULL CHECK (gravidade IN ('leve', 'média', 'grave', 'gravíssima')),
  pontos INT NOT NULL,
  valor_multa DECIMAL(10, 2) NOT NULL,
  unidade TEXT NOT NULL,
  retem_veiculo BOOLEAN DEFAULT FALSE,
  remove_veiculo BOOLEAN DEFAULT FALSE,
  recolhe_documento TEXT CHECK (recolhe_documento IN ('cnh', 'crlv', 'ambos', null)),
  amparo_legal TEXT NOT NULL,
  medida_administrativa TEXT NOT NULL,
  responsavel TEXT NOT NULL CHECK (responsavel IN ('condutor', 'proprietario', 'ambos')),
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_enquadramentos_codigo ON enquadramentos USING BTREE (codigo_mbft);
CREATE INDEX idx_enquadramentos_gravidade ON enquadramentos USING BTREE (gravidade);

-- Create remissoes table (graph of cross-references)
CREATE TABLE remissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origem_dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
  destino_dispositivo_id UUID NOT NULL REFERENCES dispositivos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('remete', 'revoga', 'altera')),
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_remissoes_origem ON remissoes (origem_dispositivo_id);
CREATE INDEX idx_remissoes_destino ON remissoes (destino_dispositivo_id);

-- Create cache_respostas table
CREATE TABLE cache_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash_pergunta TEXT NOT NULL UNIQUE,
  pergunta_original TEXT NOT NULL,
  resposta_completa JSONB NOT NULL,
  modelo_usado TEXT NOT NULL,
  tempo_geracao_ms INT,
  citacoes_validadas BOOLEAN DEFAULT FALSE,
  data_criacao TIMESTAMP DEFAULT NOW(),
  data_ultimo_acesso TIMESTAMP DEFAULT NOW(),
  ttl_dias INT DEFAULT 30
);

CREATE INDEX idx_cache_respostas_hash ON cache_respostas USING BTREE (hash_pergunta);
CREATE INDEX idx_cache_respostas_ttl ON cache_respostas (data_ultimo_acesso);

-- Create uso_diario table
CREATE TABLE uso_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_endereco TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT NOW(),
  tipo_consulta TEXT NOT NULL,
  cache_hit BOOLEAN DEFAULT FALSE,
  modelo_ia_usado TEXT,
  sucesso BOOLEAN DEFAULT TRUE,
  tempo_ms INT
);

CREATE INDEX idx_uso_diario_ip ON uso_diario USING BTREE (ip_endereco, timestamp);
CREATE INDEX idx_uso_diario_timestamp ON uso_diario USING BTREE (timestamp);

-- Create jurisprudencia table
CREATE TABLE jurisprudencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('stj', 'tj', 'cetran', 'jari')),
  numero TEXT NOT NULL UNIQUE,
  ementa TEXT NOT NULL,
  resumo TEXT,
  data_decisao DATE,
  tema TEXT,
  dispositivos_relacionados TEXT[] DEFAULT '{}',
  link_oficial TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_jurisprudencia_numero ON jurisprudencia (numero);
CREATE INDEX idx_jurisprudencia_tema ON jurisprudencia (tema);
