# Orientações para agentes

## Design de interfaces

As skills OJO estão disponíveis neste repositório:

- `.agents/skills/app-ui-ux-best-practices/SKILL.md`: revisão de usabilidade, acessibilidade, hierarquia visual, tokens, componentes e estados de interação.
- `.agents/skills/pixel-paper-editorial/SKILL.md`: interfaces com fundo pontilhado, adesivos originais em pixel art e detalhes de controles retrô, quando essa direção visual for solicitada.

Leia a skill pertinente e as referências indicadas antes de alterar interfaces. Preserve o português brasileiro, as fontes legais e os fluxos de consulta. Considere o uso em campo, telas pequenas, navegação por teclado, movimento reduzido e os modos escuro e sol nas alterações visuais.

## Origem

Skills copiadas de https://github.com/touchine-ojo/OJO-Design-Skills, revisão `3ef911afdc605395a9d74b39eacd0298b70960f9`, sob licença MIT. Cada pasta inclui a licença original e suas referências.

## Validação

Execute `npm run typecheck` e os testes existentes pertinentes às funcionalidades alteradas. Para mudanças visuais, confira também as telas em celular e desktop.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
