# Interface operacional — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Melhorar a consulta em campo no PWA existente.
**Architecture:** Reutilizar componentes, fontes oficiais e tokens CSS. Ajustar apresentação e adicionar atalhos de preenchimento no formulário existente.
**Tech Stack:** Next.js, React, TypeScript, Tailwind, Jest, Playwright.
**Spec:** `docs/superpowers/specs/2026-10-29-interface-operacional-design.md`

## Global Constraints
- Sem dependências novas, mudanças de API ou alterações nas regras jurídicas.
- Preservar modo sol, preferência de tema, voz, sugestões, Turnstile e consultas recentes.
- Pills com alvos de pelo menos 44 px, sem overflow da página.

## Review Focus
- Trocar atalho não apaga a consulta nem dispara envio.
- Número de artigo isolado chega à rota com prefixo correto; texto livre permanece intacto.
- Todos os módulos continuam acessíveis em telas estreitas.
- Resumos usam fonte oficial antes de banco/IA e não inventam valor de multa.
- Modo sol continua tendo precedência sobre escuro; PWA continua instalável.

### Task 1: Atalhos de consulta
**Files:** `components/ConsultaForm.tsx`, `tests/components/consulta-form.test.tsx`.
**Interfaces:** Mantém `ConsultaFormProps`; produz navegação `/consulta?q=...` normalizada somente para número no modo Artigo.
- [x] Testar seleção de Artigo, consulta `165` enviada como `art. 165`, preservação do texto ao trocar atalho e texto livre sem alterações.
- [x] Executar Jest do formulário e observar falhas por ausência dos atalhos.
- [x] Implementar os três atalhos acessíveis e dicas específicas.
- [x] Rodar testes do formulário e revisar o diff.

### Task 2: Navegação e página inicial
**Files:** `components/Header.tsx`, `app/page.tsx`, `app/globals.css`, testes de header e navegação responsiva.
**Interfaces:** Preserva rotas e nomes acessíveis existentes; expõe navegação principal em todos os tamanhos.
- [x] Atualizar a verificação do header para a navegação visível no celular.
- [x] Implementar pills de 44 px, busca centralizada e orientações abaixo.
- [x] Refinar tokens escuros e cabeçalhos de cards sem afetar modo sol/impressão.
- [x] Verificar componentes existentes e a UI em desktop/celular com Playwright.

### Task 3: Resumo dos cards e verificação completa
**Files:** `components/FichaFiscalizacao.tsx`, `components/CartaoTecnico.tsx`, testes de ficha e `tests/e2e/interface-operacional.test.ts`.
**Interfaces:** Preserva `FichaFiscalizacaoProps` e fonte oficial prioritária; resumo usa valores já resolvidos.
- [x] Implementar conduta e resumo visual com placeholders para dados ausentes.
- [x] Executar testes de fichas e conferir precedência das fontes.
- [x] Rodar Jest completo, TypeScript, build e fluxo de consulta no navegador.
- [x] Revisar o conjunto, registrar resultados e entregar alterações locais.

## Resultados
- Base anterior: 131 suítes e 976 testes aprovados.
- Final: 131 suítes e 981 testes aprovados (`npm test -- --runInBand`).
- `npm run typecheck`: aprovado; build de produção aprovado com geração do service worker.
- Playwright: 16 testes aprovados, desktop e mobile, usando o servidor de produção e Chromium local. Inclui consultas reais aos manuais MBFT/POP, troca de ficha, temas persistentes, manifesto e navegação.
- Verificação visual em 1440 px e 390 px. Em 360 × 800 px, o botão termina em 688,75 px, acima da navegação inferior.
- Revisão independente do código: sem achados. Compactação adicional no mobile verificada por teste de posição do botão.
- Ajustes de apresentação não alteram APIs, corpus, regras jurídicas ou cache do PWA.
- Entrega local no projeto original; sem publicação externa.
