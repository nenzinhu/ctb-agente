# Task 5: Document Ingestion System

**Objetivo:** Criar API e UI para upload e processamento de documentos legais (CTB, MBFT, resoluções)

## Arquivos a Criar

- `app/api/ingestion/upload` — POST endpoint para upload de PDF/DOCX
- `lib/ingestion/parser.ts` — Extrai texto de PDF/DOCX
- `lib/ingestion/processor.ts` — Processa texto em chunks, cria embeddings
- `lib/ingestion/chunker.ts` — Divide texto em segmentos por parágrafo/artigo
- `components/UploadForm.tsx` — UI para upload (admin)
- `tests/unit/parser.test.ts` — Testes de parsing

## Funcionalidades

1. **Upload de arquivos:**
   - Aceita PDF, DOCX, TXT
   - Valida tamanho máximo (50MB)
   - Armazena temporariamente em `/tmp`

2. **Parsing:**
   - Extrai texto limpo de PDF (usando pdfjs-dist)
   - Extrai de DOCX (usando mammoth)
   - Preserva estrutura (títulos, seções)

3. **Processamento:**
   - Divide em chunks (~500 caracteres)
   - Detecta artigos/seções automaticamente
   - Gera embeddings com EmbeddingChain
   - Insere em Supabase (`dispositivos` table)

4. **Metadados:**
   - Tipo de documento (lei, resolução, portaria, manual)
   - Data de publicação
   - Data de vigência (início/fim)
   - Norma ID (CTB, MBFT, etc.)

## Dependências

- Já instalados: pdfjs-dist, mammoth
- Existentes: EmbeddingChain, Supabase client, Zod

## Testes

- Parser: extract text from PDF, DOCX, TXT
- Chunker: split by parágrafo, mantém contexto
- Processor: cria embeddings, insere no DB

## Commit

```
feat: implement document ingestion system

- Add PDF/DOCX/TXT parser (pdfjs, mammoth)
- Create text chunker with smart splitting
- Implement embedding processor with Supabase insert
- Add upload endpoint with validation
- Include comprehensive tests
```

**Nota:** Task 6 (Admin Panel) utilizará este endpoint.
