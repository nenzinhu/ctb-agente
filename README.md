# CTB Agente

Consulta legislação de trânsito brasileira (CTB) com precisão cirúrgica usando RAG + IA.

**Público:** Agentes de trânsito (PM, PC, polícia municipal, PRF)

## 🎯 Visão Geral

Aplicativo PWA que permite consulta interativa da legislação de trânsito (Código de Trânsito Brasileiro, MBFT, resoluções CONTRAN) usando busca semântica híbrida (BM25 + vector embeddings) com LLMs plugáveis.

**Recursos:**
- Busca por código de infração (516-91), artigos (art. 165), ou situação descritiva
- Respostas estruturadas com enquadramento legal, gravidade, pontos, multa
- Checklist AIT, erros comuns, jurisprudência relacionada
- Validação de citações (não hallucina referências)
- Rate limiting + Turnstile anti-bot
- Filtro PII (placas, CPF, CNPJ)
- Suporte a múltiplos LLMs (Groq, NVIDIA, OpenRouter, Mistral)

## 🏗️ Stack

- **Frontend:** Next.js 15, React 19, TailwindCSS (PWA)
- **Backend:** Next.js API Routes
- **Database:** Supabase PostgreSQL + pgvector
- **Search:** BM25 (tsvector) + pgvector embeddings
- **LLM:** Pluggable (Groq → NVIDIA → OpenRouter → Mistral)
- **Testing:** Jest

## 📋 Roadmap

- **Batch 1 ✅:** Infraestrutura (Next.js + Supabase)
- **Batch 2 ✅:** AI providers + Query processing
- **Batch 3 📋:** Document ingestion + Admin panel
- **Batch 4 📋:** Frontend UI
- **Batch 5 📋:** PDF generation (dossiês temáticos)
- **Batch 6 📋:** E2E tests
- **Batch 7 📋:** Deployment (Vercel)

## 🚀 Quick Start

```bash
# Install
npm install

# .env.local (copy from .env.local.example)
cp .env.local.example .env.local
# Editar .env.local com suas credenciais

# Dev server
npm run dev
# Abre http://localhost:3000

# Tests
npm test
```

## 📚 Docs

- `docs/specs/2026-09-21-ctb-agente-design.md` — Especificação completa (13 seções)
- `docs/plans/2026-09-21-ctb-agente-implementation.md` — Plano de implementação (7 fases)

## 🔐 Segurança

- Sem login (acesso aberto)
- Rate limit: 30 consultas/IP/hora
- Turnstile bot protection
- Filtro PII automático
- Sem credenciais em código (`.env.local` git-ignored)

## 📝 License

Privado.

---

**Desenvolvido com Claude Code + SDD** 🤖
