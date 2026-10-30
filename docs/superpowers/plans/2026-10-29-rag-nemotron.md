# RAG Nemotron — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Disponibilizar Nemotron Embed via OpenRouter como modelo vetorial principal.
**Architecture:** Catálogo de dois modelos, configuração persistida independente da geração de texto e armazenamento separado por espaço vetorial.
**Tech Stack:** Next.js, TypeScript, Supabase/pgvector, fetch, Jest e Playwright existentes.
**Spec:** `docs/superpowers/specs/2026-10-29-rag-nemotron-design.md`.

## Global Constraints
- Reutilizar OPENROUTER_API_KEY no servidor; nunca retornar o segredo ao cliente.
- Nenhuma exclusão de vetores existentes nem reindexação remota automática.
- Nenhuma comparação entre vetores de modelos diferentes.
- Preservar indexação textual quando embedding ou migração não estiver disponível.

## Review Focus
- Vetores fora de ordem, dimensões inválidas e valores não finitos não entram no banco.
- Troca de modelo entre requisições não troca a coluna no meio de um lote.
- Falha OpenRouter não gera um vetor Mistral para uma consulta Nemotron.
- Migração ausente não impede salvar os textos.
- API de seleção/teste exige sessão administrativa e não expõe segredos.

## Tarefas
- [x] Provedor Nemotron, validação de lotes, catálogo e seleção persistida; testes primeiro.
- [x] Migração aditiva e roteamento por modelo na busca, indexação e backfill; testes de isolamento.
- [x] API administrativa, opção principal no painel RAG e diagnóstico; testes de autorização e interação.
- [x] Typecheck, suíte completa, build, conferência no navegador e revisão independente.

## Verificação
- 145 suítes e 1079 testes aprovados; TypeScript e build de produção aprovados.
- SQL da migração 015 validado por parser PostgreSQL (21 instruções). A consulta de estatísticas foi executada em PostgreSQL embutido com dados sintéticos isolados: CTB, MBFT, POP, Fatos e Estrangeiros preservam seus filtros.
- Revisão independente corrigiu a separação de CTB e manuais nas estatísticas do novo modelo.
- Navegador: sessão administrativa real apenas em servidor local com credenciais sintéticas; opção principal selecionada, chave/migração ausentes informadas, teste desabilitado sem chave, painel responsivo sem overflow e API sem sessão retorna 401.
- Conexão ao modelo real não testada: chave ausente no executor; Vercel recusou metadados de ambiente (403 de escopo). Gestão Supabase retornou 401: migração não aplicada remotamente. Nenhum segredo ou configuração de produção alterado.
- Entrega local, sem commit, push ou deploy, conforme restrição posterior do documento do usuário.
