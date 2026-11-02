# Organização da interface

**Objetivo:** aplicar as cinco prioridades da crítica, conforme pedido “organize tudo”, mantendo a identidade institucional e as funcionalidades existentes.

**Abordagem:** refinar o aplicativo Next.js/React existente. Centralizar os destinos em um catálogo compartilhado; manter Consultar, POPs e Favoritos diretos, com Fiscalização, Estudo e Documentos dentro de Ferramentas. Evitar uma reformulação visual ou novas dependências.

## Tarefas

- [x] Unificar rótulos e agrupamentos desktop/mobile. Fechar menu ao navegar, clicar fora ou pressionar Escape; preservar indicação da seção atual e devolução de foco.
- [x] Enxugar a página inicial: título orientado à tarefa, busca antes da ajuda, três exemplos, instruções detalhadas em disclosure e ressalva institucional preservada.
- [x] Ampliar controles compartilhados para ao menos 44 px e conferir temas claro, escuro e sol, viewport estreito e zoom.
- [x] Atualizar testes existentes de navegação e apresentação; verificar TypeScript e testes relevantes; inspecionar desktop/mobile em uma rodada e corrigir achados em lote.

## Verificação e limites

Todos os destinos existentes devem continuar acessíveis, incluindo geração e compressão de PDF e consultas recentes. Consultas e respostas do backend não mudam. Não publicar automaticamente. Preservar alterações pré-existentes em next-env.d.ts e AGENTS.md. Rever teclado/foco, rotas ativas, menu após troca de viewport, textos longos e posicionamento do formulário no celular. A produção está bloqueada pelo proxy; verificar localmente e relatar essa limitação.

## Resultado da verificação

Build de produção concluído; TypeScript sem erros; 133 suítes e 1.004 testes passaram. Chromium confirmou larguras 320, 390, 768 e 1440 px sem overflow horizontal ou erros JavaScript; menus abrem e fecham, Escape devolve foco e a troca mobile → desktop libera o bloqueio de rolagem. Em 390 px, campo começa em y=324 e botão termina em y=523,5. Capturas e evidências em /workspace/scratch/ctb-organizado. Não houve publicação.

## Integração com a main atual

A main remota estava 25 commits à frente da base usada na avaliação. Preservados os novos atalhos e sugestões do formulário, os tokens de tema, a arte editorial da página inicial e as demais telas. O catálogo inclui também Casos práticos. O seletor CTB/POP da base antiga não foi reintroduzido: POPs já tem acesso direto e o formulário atual possui os próprios atalhos de entrada. Verificação da integração: 154 suítes, 1.164 testes; build e TypeScript aprovados. Capturas da versão integrada em /workspace/scratch/ctb-main-final.
