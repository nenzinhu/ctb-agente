# CTB Agente

Consulta legislação de trânsito brasileira (CTB) com precisão cirúrgica usando RAG + IA.

**Público:** Agentes de trânsito (PM, PC, polícia municipal, PRF)

## 🎯 Visão Geral

Aplicativo PWA que permite consulta interativa da legislação de trânsito (Código de Trânsito Brasileiro, MBFT, resoluções CONTRAN) usando busca semântica híbrida (BM25 + vector embeddings) com LLMs plugáveis.

**Recursos:**
- Busca por código de infração (516-91), artigos (art. 165), ou situação descritiva
- Respostas estruturadas com enquadramento legal, gravidade, pontos, multa
- Checklist AIT, erros comuns, normas aplicáveis e jurisprudência cadastrada
- Validação de citações (não exibe referência inventada como verificada)
- Cache de respostas (30 dias) invalidado quando a base muda
- Dossiê temático em PDF (`@react-pdf/renderer`), cacheado por 1 semana
- Ditado por voz (Groq Whisper) para uso no campo
- Modo sol (alto contraste) para leitura sob luz do dia
- Rate limiting por IP + Turnstile anti-bot + filtro PII (placas, CPF, CNPJ)
- Suporte a múltiplos LLMs (Groq → NVIDIA → OpenRouter → Mistral)
- Painel master com documentos, enquadramentos, provedores, uso e limites

## 🏗️ Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS (PWA)
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL + pgvector
- **Search:** BM25 (tsvector) + pgvector embeddings
- **PDF:** @react-pdf/renderer
- **LLM:** Pluggable (Groq → NVIDIA → OpenRouter → Mistral)
- **Testes:** Jest (unit + componentes + rotas) e Playwright (E2E)

## 📋 Roadmap

- **Batch 1 ✅:** Infraestrutura (Next.js + Supabase)
- **Batch 2 ✅:** AI providers + Query processing
- **Batch 3 ✅:** Document ingestion + Admin panel
- **Batch 4 ✅:** Frontend UI (cartões, formulário, consultas recentes)
- **Batch 5 ✅:** PDF generation (dossiês temáticos)
- **Batch 6 ✅:** E2E tests (Playwright)
- **Batch 7 ✅:** Deployment (Vercel + CI)

Roadmap v1.1+: monitor de PLs por push, conjunto de avaliação automático (50 perguntas),
favoritos no aparelho, compartilhamento de cartão.

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
- Sem credenciais em código (`.env.local` git-ignored)

## 📝 License

Privado.
