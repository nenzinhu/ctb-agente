# Roadmap operacional — Implementation Plan

> Execução nativa em workspace isolado existente; sem novas dependências. Revisão funcional ao fim de cada grupo.

**Goal:** cumprir as dez melhorias em três entregas independentes na main e Vercel de produção.
**Architecture:** componentes compartilhados para leitura/resumo/navegação; dados públicos com fonte/versionamento; persistência local com validação e recuperação.
**Tech Stack:** Next.js 16, React 19, TypeScript, IndexedDB, Jest, Playwright.
**Spec:** `docs/superpowers/specs/2026-11-03-roadmap-operacional-design.md`.

## Global Constraints

- Preservar alterações locais pendentes fora da entrega e autenticação/serviço existentes.
- Não inferir vigência jurídica; não publicar documentos privados; não depender de IA para offline.
- Publicar main e produção ao concluir cada grupo, verificando SHA e READY.

## Review Focus

Referências ambíguas não devem abrir norma errada; textos extensos precisam continuar alcançáveis; falhas de rede/armazenamento não apagam consultas; resumos não decidem enquadramento; diferenças textuais não certificam atualização legal.

## Grupo 1 — acesso, artigo e resumo

- [x] Testar acesso direto e parser dos artigos (sufixos, páginas, artigo ausente).
- [x] Criar `lib/ctb/artigos.ts`, endpoint público de cópia local e leitor compartilhado; preservar fonte oficial como fallback.
- [x] Ligar ferramentas da home às rotas reais e adicionar resumo operacional com ficha completa expansível.
- [x] Testar leitor (carga/erro/Escape/foco), seleção de ficha e acesso aos detalhes; typecheck, Jest, build, browser.
- [x] Commit, push main e Vercel produção.

## Grupo 2 — offline, retomada e comparação

- [x] Testar busca local, armazenamento inválido/indisponível, restauração e seleção de até três fichas.
- [x] Criar pacote público versionado, IndexedDB com versão anterior, painel de download e consulta local explícita.
- [x] Persistir consultas e rascunhos locais, com descarte e sem retomada automática de requisições/resultados antigos.
- [x] Criar comparação de campos e condições a partir das fichas, sem avaliação automática.
- [x] Executar verificações, commit, push main e Vercel produção.

## Grupo 3 — origem, alterações, preferências e navegação

- [x] Testar classificação de origem, diferenças entre versões e normalização das preferências.
- [x] Explicitar origem e revisão pendente em leitor, resumo, fontes e explicações.
- [x] Comparar artigos/fichas de versões baixadas; sem versão anterior, mostrar estado vazio honesto.
- [x] Centralizar destinos e implementar escolha das três primeiras abas com restauração do padrão.
- [x] Atualizar DESIGN/UX, executar verificações finais, commit, push main e Vercel produção.
