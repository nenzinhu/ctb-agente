# Task 2: Set up Supabase database schema and migrations

**Files:**
- Create: `lib/db/schema.ts` (TypeScript types)
- Create: `scripts/seed-db.ts` (migration script)
- Create: `docs/SETUP.md` (instructions)

**Interfaces:**
- Produces: Database connection string from Supabase, 6 tables (`dispositivos`, `enquadramentos`, `remissoes`, `jurisprudencia`, `cache_respostas`, `uso_diario`) with indexes (tsvector, pgvector).
- Depends on: Task 1 must be complete (`.env.local.example` template exists)

## Steps

- [ ] **Step 1: Create Supabase project and get connection details**

In Supabase dashboard (https://supabase.com):
1. Sign up / log in
2. New project > "CTB-Agente"
3. Wait for project to initialize
4. Settings > API
5. Copy `NEXT_PUBLIC_SUPABASE_URL` (Project URL)
6. Copy `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Anon public key)
7. Copy `SUPABASE_SERVICE_ROLE_KEY` (Service role key)
8. Copy these to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

*Note: For testing purposes, you can use placeholder values. In production, use real credentials.*

- [ ] **Step 2: Create TypeScript schema types**

File: `lib/db/schema.ts`

```typescript
export interface Dispositivo {
  id: string;
  numero_dispositivo: string; // "art. 165 § 1º"
  texto: string;
  norma_id: string;
  tipo: 'lei' | 'resolucao' | 'portaria' | 'jurisprudencia' | 'manual';
  data_publicacao: string; // ISO date
  data_vigencia_inicio: string;
  data_vigencia_fim: string | null;
  embedding: number[]; // pgvector (1536 dims)
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
```

- [ ] **Step 3: Create Supabase client**

File: `lib/db/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// For server-side operations (with service role key)
const supabaseServiceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseServiceUrl, supabaseServiceKey);
```

- [ ] **Step 4: Create migration SQL file (instructions for user to run in Supabase SQL editor)**

File: `scripts/migrations.sql`

```sql
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
  embedding VECTOR(1536),
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
```

- [ ] **Step 5: Create query helper functions**

File: `lib/db/queries.ts`

```typescript
import { supabase } from './client';
import type { Dispositivo, Enquadramento } from './schema';

export async function getEnquadramentoByCodigo(codigo: string): Promise<Enquadramento | null> {
  const { data, error } = await supabase
    .from('enquadramentos')
    .select('*')
    .eq('codigo_mbft', codigo)
    .single();
  
  if (error) throw error;
  return data;
}

export async function getDispositivoByNumero(numero: string): Promise<Dispositivo | null> {
  const { data, error } = await supabase
    .from('dispositivos')
    .select('*')
    .eq('numero_dispositivo', numero)
    .single();
  
  if (error) throw error;
  return data;
}

export async function searchDispositivosByTsvector(query: string, limit = 5) {
  const { data, error } = await supabase.rpc('search_dispositivos_tsvector', {
    query_text: query,
    limit_count: limit,
  });
  
  if (error) throw error;
  return data;
}
```

- [ ] **Step 6: Create `docs/SETUP.md`**

```markdown
# CTB Agente — Setup Guia

## 1. Supabase Project

1. Create project at supabase.com
2. Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
3. Get `SUPABASE_SERVICE_ROLE_KEY` from Settings > API > Service Role Key
4. Copy to `.env.local`

## 2. Run migrations

1. Go to Supabase dashboard > SQL Editor
2. Paste the entire contents of `scripts/migrations.sql`
3. Click "Run"
4. Verify tables exist: `dispositivos`, `enquadramentos`, etc.

## 3. Initialize .env.local

```bash
cp .env.local.example .env.local
# Edit .env.local and fill in your credentials
```

## 4. Install dependencies and run dev server

```bash
npm install
npm run dev
# Open http://localhost:3000
```
```

- [ ] **Step 7: Commit**

```bash
git add lib/db/ scripts/migrations.sql docs/SETUP.md
git commit -m "feat: set up Supabase database schema with pgvector

- Create 6 tables: dispositivos, enquadramentos, remissoes, jurisprudencia, cache_respostas, uso_diario
- Add indexes for full-text search (tsvector), vector search (pgvector), and lookups
- Create Supabase client (anon + service role)
- Add query helper functions for common operations
- Document setup process in SETUP.md

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>"
```

## Notes

- pgvector extension is created in Step 4; if Supabase project doesn't have it enabled, the SQL will fail gracefully
- All tables use UUID primary keys with gen_random_uuid() default
- Indexes are optimized for: lookups (BTREE), full-text search (GIN), vector search (IVFFlat)
- No sample data is inserted in this task; that comes in a later data-loading step
