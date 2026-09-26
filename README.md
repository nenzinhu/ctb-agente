
Consulta a legislação de trânsito brasileira (CTB) e os POPs da PMSC com RAG + IA, sempre com a fonte ao lado.

**Público:** Agentes de trânsito (PM, PC, polícia municipal, PRF)

## 🎯 Visão Geral

Aplicativo PWA que permite consulta interativa da legislação de trânsito (Código de Trânsito Brasileiro, MBFT, resoluções CONTRAN) usando busca semântica híbrida (BM25 + vector embeddings) com LLMs plugáveis.

**Recursos:**
- Busca por código de infração (516-91), artigos (art. 165), ou situação descritiva
- **"Você quis dizer?" instantâneo**: gírias e siglas (zap, grau, chapado, fumê, farol vermelho, CNH, PPD) viram as infrações relacionadas, com exemplo "Explicando fácil", sem esperar a IA
- Busca sem depender de acento nem de todas as palavras (`habilitacao` acha "habilitação"), com gírias de campo expandidas (ex.: "bafômetro" → etilômetro)
- CTB compilado (Lei 9.503/97, 93 páginas) incluído no app: um clique em Painel → Base CTB → "Indexar agora"
- Aba **POP-PMSC** (`/pop`): perguntas sobre os Procedimentos Operacionais Padrão respondidas só com os trechos indexados, citando POP, seção e página
- Anexo de documentos em PDF, DOC, DOCX, MD e TXT (vários de uma vez), com indexação por artigo/seção e página
- **Comprimir PDF** (`/comprimir-pdf`) no próprio aparelho: Leve, Forte ou Máxima (somente texto, sem design, + `.txt`)
- Respostas estruturadas com enquadramento legal, gravidade, pontos, multa
- Checklist AIT, erros comuns, normas aplicáveis e jurisprudência cadastrada
- Validação de citações (não exibe referência inventada como verificada)
- Cache de respostas (30 dias) invalidado quando a base muda (ingestão/CRUD) + limpeza diária de expirados
- Dossiê temático em PDF (`@react-pdf/renderer`), cacheado por 1 semana
- Ditado por voz (Groq Whisper) para uso no campo
- Modo sol (alto contraste) para leitura sob luz do dia
- Favoritos no aparelho (`/favoritos`), guardados em localStorage — nada vai para o servidor
- Compartilhamento de cartão como texto + link, pela folha nativa do celular ou cópia
- Rate limiting por IP + Turnstile anti-bot + filtro PII (placas, CPF, CNPJ)
- Suporte a múltiplos LLMs em cadeia de fallback (Groq, Cloudflare Workers AI, NVIDIA, Nous, OrcaRouter, AnyAPI, OpenRouter, Mistral)
- Painel master com base CTB, POP-PMSC, enquadramentos, provedores, uso e limites

## 🏗️ Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS (PWA)
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL + pgvector
- **Search:** BM25 (tsvector) + pgvector embeddings
- **PDF:** @react-pdf/renderer
- **LLM:** Pluggable em cadeia (Groq → NVIDIA → Nous → OrcaRouter → AnyAPI → OpenRouter → Mistral)
- **Testes:** Jest (unit + componentes + rotas) e Playwright (E2E)

## 🧱 Organização do código

Camadas, de fora para dentro: `app/` → `components/` → `lib/`.

- **`app/`** — rotas e páginas. Ex.: `app/favoritos/page.tsx` só lista o que está no aparelho.
- **`components/`** — apresentação: estado de UI e textos. Não guarda regra de negócio.
- **`lib/`** — domínio e engines, sem React; roda em teste e no servidor.
  - `lib/favorites/favorites.ts` — cartões salvos no aparelho (localStorage), `toggleFavorite` devolve `salvo | removido | falhou`.
  - `lib/share/card.ts` — como um cartão vira texto + link (puro).
  - `lib/share/send.ts` — como o texto chega ao sistema (share nativo, com clipboard de reserva).
  - `lib/ingestion/` — leitura dos formatos (`parser.ts`), corte estrutural por artigo/seção com página (`chunker.ts`) e indexação (`indexar.ts`).
  - `lib/search/` — busca híbrida (palavras + vetores) unida por Reciprocal Rank Fusion (`fusion.ts`).
  - `lib/rag/pop.ts` — recuperação e resposta fundamentada da aba POP-PMSC.
  - `lib/pdf-tools/` — compressor de PDF que roda no navegador (pdf.js + gravador de PDF mínimo).

`lib/` nunca importa de `components/` nem de `app/`.

## 📋 Roadmap

- **Batch 1 ✅:** Infraestrutura (Next.js + Supabase)
- **Batch 2 ✅:** AI providers + Query processing
- **Batch 3 ✅:** Document ingestion + Admin panel
- **Batch 4 ✅:** Frontend UI (cartões, formulário, consultas recentes)
- **Batch 5 ✅:** PDF generation (dossiês temáticos)
- **Batch 6 ✅:** E2E tests (Playwright)
- **Batch 7 ✅:** Deployment (Vercel + CI)

- **v1.1 ✅:** favoritos no aparelho e compartilhamento de cartão

Roadmap v1.1+: monitor de PLs por push, conjunto de avaliação automático (50 perguntas).

## 🚀 Quick Start

```bash
npm install

cp .env.local.example .env.local   # preencha as credenciais
npm run dev                        # http://localhost:3000
```

Aplicar as migrations no Supabase (SQL Editor), na ordem:

1. `scripts/migrations.sql`
2. `scripts/migrations-002-config.sql`
3. `scripts/migrations-003-search-functions.sql`
4. `scripts/migrations-004-rls.sql`
5. `scripts/migrations-005-pin-function-search-path.sql`
6. `scripts/migrations-006-documents-storage-bucket.sql`
7. `scripts/migrations-007-ratelimit-cache.sql` (rate limit atômico + invalidação do cache)
8. `scripts/migrations-008-rag-indexacao.sql` (busca sem acento/OR, índice HNSW, base de POPs e novos formatos no bucket)

A migration 007 é opcional: sem ela o app continua funcionando (rate limit
legado e invalidação via fallback), mas perde a atomicidade anti-rajada e a
limpeza por TTL individual.

A `migrations-007-drop-numero-dispositivo-unique.sql` não precisa ser
aplicada: a 008 inclui a mesma correção (o mesmo "art. 1" pode existir em
normas diferentes).

A migration 008 é necessária para a aba POP-PMSC e para a busca nova. Depois
dela, entre em `/admin` → Base CTB → **Indexar agora** para carregar o CTB
compilado, e use "Gerar vetores pendentes" quando houver `MISTRAL_API_KEY`
(sem vetores, a busca por palavras já funciona).

Depois, popular a base com dados de exemplo:

```bash
npm run seed
```

## 🧪 Scripts

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run typecheck` | `tsc --noEmit` em todo o projeto |
| `npm test` | Testes unitários, de componentes e de rotas (Jest) |
| `npm run test:e2e` | Fluxos end-to-end (Playwright, porta 3210) |
| `npm run seed` | Popula o corpus inicial |
| `npm run icons` | (Re)gera os ícones PWA sem dependências |
| `npm run check:health` | Smoke check do deploy (health + rotas públicas) |

## ⏰ Cron

O `vercel.json` agenda `GET /api/cron/clear-cache` diariamente (04:00 UTC) para
remover as entradas expiradas de `cache_respostas`. Em deploy fora da Vercel,
chame a rota por um cron externo com o header `Authorization: Bearer $CRON_SECRET`.

O conjunto E2E que depende de base populada só roda com `E2E_SEEDED=1`.

## 📚 Docs

- `docs/specs/2026-09-21-ctb-agente-design.md` — Especificação completa
- `docs/plans/2026-09-21-ctb-agente-implementation.md` — Plano de implementação
- `docs/DEPLOY.md` — Deploy, variáveis de ambiente e verificação pós-deploy
- `BATCH-4-7-STATUS.md` — Status histórico das entregas

## 🔐 Segurança

- Sem login para consultar; painel master com sessão httpOnly + bcrypt
- Rate limit por IP/hora, configurável no painel (Limites)
- Turnstile anti-bot, exigido conforme o consumo do IP
- Filtro PII antes de qualquer envio a provedores de IA
- Sem credenciais em código (`.env*.local` git-ignored)
- PII (placas, CPF, CNPJ) filtrada antes de gravar em `uso_diario`/`cache_respostas` e antes de provedores de IA

## 📝 License

Privado.
