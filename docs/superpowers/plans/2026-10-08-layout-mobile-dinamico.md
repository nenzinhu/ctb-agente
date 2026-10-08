# Layout Mobile Dinâmico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar navegação mobile-first consistente e interações sutis em todas as telas públicas, sem alterar o desktop nem duplicar a Lista de Fatos PMSC.

**Architecture:** Um shell mobile compartilhado será montado no layout raiz e reutilizará as rotas públicas existentes. A barra inferior e as folhas modais serão componentes isolados; estilos globais fornecerão safe-area, estados de movimento e espaçamento, enquanto páginas e cartões receberão apenas ajustes responsivos pontuais.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Jest, Testing Library e Playwright.

**Spec:** `docs/superpowers/specs/2026-10-08-layout-mobile-dinamico-design.md`

## Global Constraints

- Aplicar somente às telas públicas; não alterar o painel administrativo.
- Exibir a barra inferior apenas em telas pequenas e preservar a navegação desktop.
- Usar quatro destinos: Buscar, Ferramentas, Favoritos e Mais.
- Garantir alvos de toque de pelo menos 44 × 44 px e respeitar `safe-area-inset-bottom`.
- Usar transições entre 150 e 220 ms e respeitar `prefers-reduced-motion`.
- Não duplicar o PDF de fatos: manter os 510 registros e a coleção `natureza_potencial` existentes.

## Review Focus

- Teclado aberto em celulares baixos: campo e botão principal devem continuar alcançáveis.
- Rota ativa aninhada: `/consulta?...` e páginas de ferramentas devem marcar o destino correto.
- Folha aberta durante mudança de rota: deve fechar e restaurar o scroll da página.
- Navegação por teclado/leitor de tela: foco deve entrar na folha, fechar com Escape e voltar ao acionador.
- Conteúdo longo e largura de 320 px: não pode criar rolagem horizontal nem ficar sob a barra.

---

### Task 1: Navegação inferior e folha acessível

**Files:**
- Create: `components/mobile/BottomSheet.tsx`
- Create: `components/mobile/MobileNavigation.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/mobile-navigation.test.tsx`

**Interfaces:**
- Produces: `BottomSheet({ id, title, open, onClose, children, triggerRef })` e `MobileNavigation()`.
- Consumes: `usePathname`, `next/link` e as rotas públicas existentes.

- [ ] **Step 1: Escrever testes falhos** para quatro destinos, `aria-current`, abertura/fechamento das folhas, Escape, clique externo, foco e fechamento ao mudar de rota.
- [ ] **Step 2: Executar** `npm test -- --runInBand tests/components/mobile-navigation.test.tsx` e confirmar falha por componentes ausentes.
- [ ] **Step 3: Implementar os componentes** com portal/modal acessível, bloqueio de scroll, restauração de foco e destinos definidos na especificação.
- [ ] **Step 4: Montar no layout e adicionar CSS** para esconder no desktop, reservar espaço no mobile e aplicar safe-area.
- [ ] **Step 5: Executar o teste** e confirmar aprovação.
- [ ] **Step 6: Commitar** `feat: add accessible mobile navigation`.

### Task 2: Hierarquia mobile-first e busca prioritária

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/NavTabs.tsx`
- Modify: `app/page.tsx`
- Modify: `components/ConsultaForm.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/header.test.tsx`
- Test: `tests/components/consulta-form.test.tsx`

**Interfaces:**
- Consumes: `MobileNavigation` do Task 1.
- Produces: cabeçalho compacto e início com busca como primeira ação mobile.

- [ ] **Step 1: Escrever testes falhos** para rótulos essenciais, ação de busca prioritária, alvos de 44 px e ausência de duplicação da navegação principal no mobile.
- [ ] **Step 2: Executar os testes direcionados** e confirmar as falhas esperadas.
- [ ] **Step 3: Ajustar cabeçalho, abas e início** mantendo o DOM desktop existente sempre que possível.
- [ ] **Step 4: Ajustar o formulário** para campo, voz e botão funcionarem em 320 px sem rolagem lateral.
- [ ] **Step 5: Executar os testes direcionados** e confirmar aprovação.
- [ ] **Step 6: Commitar** `feat: prioritize mobile search experience`.

### Task 3: Resultados, cartões e movimento reduzido

**Files:**
- Modify: `components/ConsultaResult.tsx`
- Modify: `components/FichaFiscalizacao.tsx`
- Modify: `components/pop/FichaPop.tsx`
- Modify: `components/fatos-pmsc/FatosPmscConsulta.tsx`
- Modify: `components/ui/ResultChoices.tsx`
- Modify: `app/globals.css`
- Test: `tests/components/consulta-result.test.tsx`
- Test: `tests/components/fatos-pmsc-consulta.test.tsx`
- Test: `tests/components/mobile-results.test.tsx`

**Interfaces:**
- Produces: cartões de largura total, detalhes expansíveis quando longos e estados de entrada/carregamento sem salto.

- [ ] **Step 1: Escrever testes falhos** para conteúdo essencial sempre visível, expansão acessível, ações sem overflow e classes de movimento reduzido.
- [ ] **Step 2: Executar os testes direcionados** e confirmar as falhas esperadas.
- [ ] **Step 3: Implementar os ajustes responsivos** e transições de 150–220 ms sem animação contínua.
- [ ] **Step 4: Adicionar `prefers-reduced-motion`** que desative transições e deslocamentos não essenciais.
- [ ] **Step 5: Executar os testes direcionados** e confirmar aprovação.
- [ ] **Step 6: Commitar** `feat: improve mobile result interactions`.

### Task 4: Cobertura das telas públicas e verificação RAG

**Files:**
- Modify: `app/enquadramento/page.tsx`
- Modify: `app/pop/page.tsx`
- Modify: `app/fatos-pmsc/page.tsx`
- Modify: `app/professor/page.tsx`
- Modify: `app/favoritos/page.tsx`
- Modify: `app/apostila/page.tsx`
- Modify: `app/comprimir-pdf/page.tsx`
- Modify: `app/gerador-pdf/page.tsx`
- Modify: `tests/e2e/search-selection.test.ts`
- Test: `tests/unit/acervo-fatos-pmsc.test.ts`

**Interfaces:**
- Consumes: shell e estilos dos Tasks 1–3.
- Produces: todas as rotas públicas sem overflow e com espaço para a barra inferior.

- [ ] **Step 1: Acrescentar verificações E2E** para 320, 375, 390, 430 e 768 px, sem overflow horizontal e com destinos acessíveis.
- [ ] **Step 2: Executar E2E direcionado** e registrar as páginas que falham.
- [ ] **Step 3: Ajustar somente as páginas com falha**, convertendo laterais em fluxo vertical e mantendo o desktop.
- [ ] **Step 4: Verificar os 510 fatos** e a ausência de duplicação no acervo local.
- [ ] **Step 5: Executar testes de componentes, E2E, suíte completa, `npm run typecheck` e `npm run build`**.
- [ ] **Step 6: Commitar** `feat: complete responsive public mobile layout`.

### Task 5: Revisão final e publicação

**Files:**
- Review: todos os arquivos alterados nos Tasks 1–4.

**Interfaces:**
- Consumes: implementação completa e commits anteriores.
- Produces: branch verificada e enviada para `origin/master` após aprovação dos gates.

- [ ] **Step 1: Revisar o diff** para acessibilidade, regressões desktop, cache PWA e arquivos indevidos.
- [ ] **Step 2: Executar novamente** `npm test -- --runInBand`, `npm run typecheck` e `npm run build`.
- [ ] **Step 3: Confirmar árvore limpa e commits esperados**.
- [ ] **Step 4: Fazer push** com `git push origin HEAD:master`.
- [ ] **Step 5: Confirmar que `origin/master` aponta para o commit local**.
