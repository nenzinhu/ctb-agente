# Batch 4-7 — Status da Execução

**Atualizado em:** 2026-09-22
**Branch:** master

---

## Resumo

| Task | Componente | Status |
|---|---|---|
| 1-3 | Infraestrutura, IA, ingestão, admin | ✅ Completo |
| 7 | Exibição do resultado da consulta | ✅ Completo |
| 8 | Busca e consultas recentes | ✅ Completo |
| 9 | Backend de PDF (dossiê temático) | ✅ Implementado neste repo |
| 10 | UI de PDF (`/gerador-pdf`) | ✅ Implementado neste repo |
| 11 | Testes E2E (Playwright) | ✅ Implementado neste repo |
| 12 | Configuração de deploy (Vercel) | ✅ Documentado em `docs/DEPLOY.md` |
| 13 | Seed do corpus | ✅ `npm run seed` |
| 14 | Deploy final | ⏳ Depende das credenciais do projeto |

A versão anterior deste documento dizia que as tasks 9-14 existiam apenas em
relatórios de agentes. O código foi agora implementado e verificado aqui.

---

## O que foi entregue

### Correções de bugs

1. **Consulta por código devolvia cartão vazio.** O handler retornava a linha crua
   de `enquadramentos`; agora `buildCardFromEnquadramento` monta o `CartaoEstruturado`
   completo (checklist, erros comuns, resumo, normas, citações, jurisprudência).
2. **Consulta por artigo também não montava cartão** (o código do MBFT era passado
   como se fosse número de dispositivo). Agora há `buildCardFromNormas`.
3. **`/api/consulta` devolvia 500 para erro de validação.** Agora 400 com detalhes do
   campo, 429 para rate limit e 403 para IP bloqueado/Turnstile.
4. **Turnstile apontava para o endpoint errado** (`/turnstile/validate` em vez de
   `/turnstile/v0/siteverify`) e nunca era exigido. Corrigido e ligado ao widget.
5. **`metadata.viewport/themeColor`** (deprecado no Next 15) movido para `export const viewport`.
6. **`serverExternalPackages: ['@node-rs/argon2']`** removido: pacote inexistente no projeto.
7. **Ícones PWA ausentes** (o manifest apontava para arquivos que não existiam) e
   `favicon.ico` gerados por `npm run icons`.
8. **Caminho sem banco demorava 35 s** por retries do Supabase em URL placeholder;
   agora curto-circuita e responde em ~0,1 s.
9. **`valor_multa` é armazenado em centavos** — o seed de exemplo do plano usava reais
   e um `recolhe_documento` em maiúsculas que violava o `CHECK` do banco.

### Novas funcionalidades

- **Dossiê PDF** com capa, normas, enquadramentos, procedimento, exemplos,
  jurisprudência e projetos de lei (marcados como PROPOSTA), com cache semanal.
- **Voz** (`/api/transcribe` + botão de ditado) via Groq Whisper, com filtro de PII.
- **Modo sol** (alto contraste) com preferência persistida.
- **Cache de respostas** em `cache_respostas` (30 dias) + estatísticas de cache hit.
- **Jurisprudência** passa a ser lida da base em todo cartão (antes era `[]` fixo).
- **Painel master com 5 abas:** Documentos, Enquadramentos (CRUD), Provedores de IA
  (com ping real), Uso (consultas/dia, cache hit, perguntas sem resposta, falhas) e
  Limites (rate limit, Turnstile, IPs bloqueados).
- **`/api/health`** com status do banco, do cache e dos provedores.
- **CI** (`.github/workflows/ci.yml`): typecheck, testes e build; job E2E sob demanda.

---

## Verificação executada

| Checagem | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ sem erros |
| `npx jest` | ✅ 20 suítes, 182 testes (antes: 58 testes + 14 `.skip`) |
| `npx next build` | ✅ build de produção |
| `POST /api/pdf/generate` (dev server) | ✅ 200, `application/pdf`, 5,4 kB, `%PDF` válido (sem banco) |
| `/api/health`, `/`, `/gerador-pdf`, `/consulta`, `/admin` | ✅ 200 / 200 / 200 / 307→login |
| Erros de validação | ✅ 400 (JSON, tamanho), 503 (voz sem chave), 401 (admin sem sessão) |

## Pendências conhecidas

- Deploy real na Vercel e aplicação das migrations dependem das credenciais do
  projeto (ver `docs/DEPLOY.md`).
- As funções RPC `search_dispositivos_tsvector` e `search_dispositivos_vector`
  agora existem em `scripts/migrations-003-search-functions.sql`, mas ainda
  precisam ser aplicadas no Supabase real; sem elas a busca híbrida degrada
  (sem erro 500).
- O seed insere dados de exemplo: códigos MBFT e valores devem ser revisados.

### Correções adicionais (auditoria pós-deploy)

10. **`dispositivos.embedding` era `VECTOR(1536)`** (dimensão da OpenAI), mas o
    único provedor de embeddings plugado é o Mistral (`mistral-embed`, 1024
    dims). Toda inserção real teria falhado por incompatibilidade de dimensão.
    Corrigido para `VECTOR(1024)` em `scripts/migrations.sql` e nas funções RPC.
11. **`processChunks` tentava inserir `tsvector_pt` manualmente**, mas essa
    coluna é `GENERATED ALWAYS ... STORED` — Postgres rejeita insert explícito
    nela. Toda ingestão de documento teria falhado. Removido o campo (e a
    função `generateTsvector`, agora morta) de `lib/ingestion/processor.ts`.
    Coberto por `tests/unit/processor.test.ts` (sem teste algum antes).
12. **Funções RPC de busca híbrida nunca existiam no banco** — o código já as
    chamava (`lib/search/bm25.ts`, `lib/search/vector.ts`) mas nenhuma migration
    as criava. Adicionadas em `scripts/migrations-003-search-functions.sql`.
13. **RLS estava desligado nas 8 tabelas** — a chave pública (exposta no
    bundle do navegador) tinha leitura e escrita total no banco, inclusive em
    `configuracoes` e `ip_bloqueados`. Habilitado em
    `scripts/migrations-004-rls.sql`, com `uso_diario` (IPs e perguntas de
    todo mundo) travado 100% para a service role — `lib/ratelimit/limiter.ts`
    passou a usar `supabaseAdmin` em vez da chave anônima.
14. **Upload de documento estava quebrado de duas formas**: o Vercel rejeita
    corpos de requisição acima de 4,5 MB antes da rota rodar (texto puro, não
    JSON — daí o erro "Unexpected token 'R'..."), e o formulário nunca enviava
    `normaId`/`documentType`, que a rota exige. Reescrito para upload direto
    do navegador pro Supabase Storage via URL assinada
    (`/api/admin/documents/upload-url` + bucket privado
    `documentos-pendentes`, `scripts/migrations-006-documents-storage-bucket.sql`),
    restaurando o limite original de 50 MB; `/api/ingestion/upload` agora só
    recebe `{ storagePath, normaId, documentType }` e baixa o arquivo com a
    service role. A rota também não checava sessão de admin — corrigido.
    Coberto por `tests/api/upload-url.test.ts`, `tests/api/ingestion-upload.test.ts`
    e `tests/components/admin-upload-form.test.tsx` (nenhum teste existia antes).
15. **Parsing de PDF real sempre falhava.** Duas causas em `lib/ingestion/parser.ts`:
    (a) `fs.readFileSync` devolve um `Buffer`, e o pdfjs-dist rejeita isso
    (`Please provide binary data as Uint8Array, rather than Buffer`) mesmo
    `Buffer` sendo tecnicamente uma subclasse de `Uint8Array` — ele checa o
    construtor exato; (b) o import usava o build de navegador (`pdfjs-dist`)
    em vez do build de Node (`pdfjs-dist/legacy/build/pdf.mjs`), e o
    `workerSrc` apontava pra uma URL de CDN que não faz sentido rodando no
    servidor. Corrigido: cópia pra `Uint8Array` real e troca pro build
    legacy (que detecta Node e usa worker in-process automaticamente, sem
    precisar de `workerSrc`). Verificado com o pdfjs-dist real (não só
    mock) contra um PDF de verdade. Coberto por um novo teste de PDF em
    `tests/unit/parser.test.ts` — só havia teste de TXT antes; o mock em
    `tests/mocks/pdf.js` também passou a reproduzir a checagem estrita de
    `Buffer` do pdfjs real, então essa classe de bug não passa mais
    despercebida.
16. **O fallback de worker do item 15 ainda quebrava, só que na Vercel.**
    Mesmo no build legacy, sem `GlobalWorkerOptions.workerSrc` definido, o
    pdfjs tenta `await import(workerSrc)` (`./pdf.worker.mjs`, relativo ao
    próprio pacote) pra montar um worker "fake" em processo — isso funciona
    num `node_modules` normal, mas quando o Next/Vercel empacota a rota num
    arquivo único, não existe `pdf.worker.mjs` do lado do bundle e o import
    dinâmico 404: `Cannot find module '.../pdf.worker.mjs'`. Corrigido
    importando `WorkerMessageHandler` de `pdfjs-dist/legacy/build/pdf.worker.mjs`
    estaticamente e registrando em `globalThis.pdfjsWorker` — o pdfjs checa
    isso antes de tentar o import dinâmico (`PDFWorker.#mainThreadWorkerMessageHandler`
    em `pdf.mjs`), então o caminho problemático nunca roda. Confirmado
    inspecionando o `route.js` compilado (`.next/server/app/api/ingestion/upload/route.js`
    foi de ~161 B pra 2,16 MB, prova que o worker foi embutido no bundle).
