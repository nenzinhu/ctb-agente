# Seletores Operacionais Responsivos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os seletores de POPs e caminhões para leitura e uso responsivos em desktop e celular.

**Architecture:** Um combobox reutilizável controla a escolha do manual de POPs sem depender do popup nativo do sistema. O seletor de veículos mantém os dados atuais, mas usa cards responsivos e uma variante maior do SVG.

**Tech Stack:** React 19, Next.js, TypeScript, Tailwind CSS, Jest/Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-31-seletores-operacionais-responsivos-design.md`

## Global Constraints

- Não adicionar dependências.
- Preservar navegação por teclado, leitor de tela e movimento reduzido.
- Não alterar limites técnicos ou dados do catálogo.

## Review Focus

- Títulos muito longos não podem criar rolagem horizontal.
- Listas grandes devem ter busca e rolagem vertical.
- Mobile deve empilhar desenho e conteúdo sem reduzir o SVG a ponto ilegível.
- Desktop deve aproveitar largura sem deixar desenhos ou textos comprimidos.
- Escape, setas e seleção devem manter foco previsível.

---

### Task 1: Combobox responsivo de POPs

**Files:**
- Create: `components/ui/SearchableSelect.tsx`
- Modify: `components/pop/PopConsulta.tsx`
- Test: `tests/components/pop-manual-selector.test.tsx`

- [ ] Escrever teste que reproduz o seletor nativo e exige combobox limitado, busca e seleção.
- [ ] Executar o teste e confirmar falha por ausência do combobox.
- [ ] Implementar `SearchableSelect` e substituir o `select` do manual.
- [ ] Executar o teste e confirmar aprovação.

### Task 2: Cards responsivos e desenhos legíveis

**Files:**
- Modify: `components/pesos-dimensoes/SeletorConfiguracao.tsx`
- Modify: `components/pesos-dimensoes/DesenhoVeiculo.tsx`
- Test: `tests/components/seletor-configuracao.test.tsx`
- Test: `tests/components/desenho-veiculo-profissional.test.tsx`

- [ ] Escrever testes para layout empilhável, títulos em maiúsculas e SVG/legendas ampliados.
- [ ] Executar os testes e confirmar falha esperada.
- [ ] Implementar cards, etiquetas e dimensões tipográficas responsivas.
- [ ] Executar os testes e confirmar aprovação.

### Task 3: Verificação e publicação

**Files:**
- Modify: `tests/e2e/search-selection.test.ts`

- [ ] Atualizar o cenário E2E para o combobox pesquisável.
- [ ] Executar typecheck e suíte completa.
- [ ] Verificar larguras de 390 px e 1280 px.
- [ ] Criar commit e avançar `main` com lease.
