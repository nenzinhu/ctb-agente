# Busca operacional de POPs, CTB e fallback de IA

## Objetivo

Entregar consultas rápidas e precisas para uso operacional, priorizando sempre
as fontes oficiais incluídas no aplicativo. A IA pode organizar e explicar
fontes recuperadas, mas não pode criar uma orientação jurídica ou operacional
quando nenhuma fonte oficial sustenta a resposta.

## Princípios

1. Identificadores exatos vencem qualquer busca aproximada.
2. MBFT e POPs empacotados são a primeira camada, rápida e determinística.
3. O banco/RAG complementa a fonte local com normas e documentos indexados.
4. A IA redige somente a partir das fontes recuperadas.
5. Indisponibilidade de IA nunca remove os trechos oficiais da resposta.
6. Provedores instáveis são temporariamente ignorados, mas voltam a ser
   testados depois do período de recuperação.

## Busca de POPs

- Um número explícito de POP retorna somente o procedimento correspondente.
- A busca textual usa índice local carregado uma vez por processo.
- O ranking atribui maior peso ao número e título, depois a execução,
  atividades críticas e sequência; fundamentação, anexos e texto auxiliar têm
  peso menor.
- Resultados precisam cobrir os conceitos importantes da consulta. Uma palavra
  genérica isolada não é suficiente para apresentar um POP como resposta.
- Quando não houver correspondência segura, a interface informa que não
  localizou um POP oficial e pode mostrar até três sugestões próximas,
  identificadas como sugestões.
- O fallback atual para conhecimento geral do modelo será removido.

## Busca por código MBFT e CTB

- Formatos equivalentes como `516-91`, `51691`, `516 91` e `5169-1` são
  normalizados para o mesmo identificador.
- Um código completo consulta primeiro as 411 fichas MBFT locais. Código
  inexistente nunca é substituído por um código semelhante.
- Código parcial pode produzir sugestões, sem selecionar automaticamente uma
  infração.
- Artigo, parágrafo e inciso do CTB continuam sendo tratados como referências
  legais, separados dos códigos MBFT.
- Depois da ficha exata, o banco pode acrescentar o dispositivo legal e normas
  relacionadas. Essas fontes complementares não substituem nem alteram a ficha.

## Cadeia de provedores

- O painel administrativo continua oferecendo teste real de cada provedor e
  modelo configurado.
- Cada tentativa registra sucesso, falha, latência, modelo e instante do teste,
  sem registrar chaves ou conteúdo sensível.
- Timeout, limite, erro de servidor, modelo removido e resposta vazia contam
  como falha operacional.
- Um circuito abre após falhas consecutivas e ignora temporariamente aquele
  provedor. Depois do intervalo de recuperação, uma nova tentativa é permitida.
- O provedor preferido continua em primeiro lugar quando saudável. Os demais
  são ordenados por disponibilidade recente e latência, preservando fallback.
- Se todos falharem, a resposta contém apenas as fontes recuperadas e um aviso
  claro de indisponibilidade da redação por IA.

## Painel RAG

A seção de RAG mostrará para cada provedor configurado:

- estado `funcionando`, `degradado`, `indisponível` ou `não configurado`;
- modelo efetivamente testado;
- latência do último teste;
- data e resultado do último teste;
- ação para testar novamente.

O painel também explicará a ordem real da consulta: fonte local, banco/RAG e
redação fundamentada por IA.

## Cache e segurança

- A versão das chaves de cache será alterada para não reutilizar respostas POP
  produzidas antes da remoção do conhecimento geral.
- Consultas personalizadas e rotas administrativas continuam fora do cache do
  service worker.
- Logs e métricas usam texto filtrado e nunca incluem credenciais.
- Respostas sem fonte não serão persistidas como respostas válidas.

## Verificação

- Testes unitários para número exato, código normalizado, código inexistente,
  ranking por campos, cobertura mínima e sugestões.
- Testes de API provando que uma pergunta sem POP não chama a geração geral.
- Testes da cadeia para timeout, rate limit, circuito aberto, recuperação e
  fallback bem-sucedido.
- Testes do painel para os quatro estados operacionais.
- Regressão completa, typecheck e build de produção.

## Critérios de aceite

- Código MBFT exato retorna a ficha oficial local sem depender de IA.
- Número exato de POP não retorna outro procedimento.
- Nenhuma orientação operacional é gerada sem fonte oficial.
- Uma falha de provedor não impede o uso das fontes nem bloqueia os demais.
- O painel informa quais provedores foram efetivamente testados; estar apenas
  configurado não equivale a estar funcionando.
