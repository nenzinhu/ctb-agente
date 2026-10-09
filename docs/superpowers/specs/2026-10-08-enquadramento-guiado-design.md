# Assistente de enquadramento guiado

## Objetivo

Criar uma aba pública que ajude o agente a comparar enquadramentos MBFT a
partir da descrição de uma ocorrência. O assistente faz perguntas objetivas,
extraídas exclusivamente das fichas oficiais, e apresenta possibilidades para
conferência. Ele não seleciona nem declara automaticamente a infração correta.

## Restrições

- O fluxo funciona sem IA, sem banco e sem conexão de rede.
- A descrição e as respostas permanecem somente na memória da página.
- Placa, CPF, CNH e outros dados pessoais são filtrados antes da análise.
- Código MBFT completo é um identificador exato e tem prioridade absoluta.
- A ausência de evidência produz pedido de esclarecimento, nunca uma invenção.
- O resultado apresenta no máximo três opções e exige decisão humana.

## Entrada

A nova aba **Enquadramento guiado** oferece um campo de texto com ditado. O
agente descreve fatos observáveis da ocorrência. A interface orienta a não
informar nomes, documentos ou placas, embora o filtro de PII continue ativo.

## Seleção inicial

O motor local pesquisa as 411 fichas MBFT nos campos:

1. tipificação resumida e completa;
2. situações de "quando autuar";
3. exemplos de observações;
4. situações de "quando não autuar" apenas como evidência de exclusão;
5. código e amparo legal quando explicitamente informados.

O ranking existente de cobertura, sinônimos, prefixos e tolerância a erros é
reutilizado. Um código completo ausente não pode ser substituído por outro.

## Perguntas discriminantes

O motor compara os candidatos e produz perguntas de `sim`, `não` ou `não
informado`. Cada pergunta representa uma diferença material encontrada nas
fichas, principalmente entre "quando autuar" e "quando não autuar".

As perguntas são templates determinísticos construídos a partir dos textos
oficiais. A primeira versão não usa IA nem árvores manuais por tema. Perguntas
duplicadas ou baseadas apenas em palavras genéricas são removidas.

Cada resposta recalcula os candidatos:

- `sim` favorece fichas cuja condição oficial contém o critério;
- `não` elimina fichas que exigem aquele critério e favorece exclusões oficiais;
- `não informado` mantém as possibilidades e avança;
- respostas contraditórias não produzem decisão; a interface informa que os
  fatos precisam ser revistos.

## Resultado

A tela mostra até três fichas lado a lado, ordenadas por aderência, contendo:

- código MBFT e tipificação;
- amparo legal;
- gravidade e pontos;
- penalidade e medida administrativa;
- quando autuar;
- quando não autuar;
- fatos informados que favoreceram ou contrariaram a opção.

Nenhuma ficha aparece marcada como "correta". A linguagem será
"possibilidades para conferência" e haverá aviso para validar a situação real e
a versão vigente do MBFT.

## Estados e erros

- Nenhum candidato: solicitar nova descrição com fatos observáveis.
- Um candidato: ainda mostrar a ficha como possibilidade, sem confirmação
  automática.
- Candidatos empatados: fazer nova pergunta discriminante quando existir.
- Sem pergunta útil: apresentar a comparação e informar que não há elementos
  suficientes para diferenciar.
- Corpus indisponível: informar indisponibilidade local sem chamar IA.

## Arquitetura

1. Um módulo puro recebe descrição, fichas e respostas, retornando candidatos,
   perguntas e evidências. Não acessa rede, banco ou estado global.
2. Uma API pública recebe somente o texto filtrado e as respostas atuais. Ela
   carrega as fichas locais e executa o módulo puro; não persiste a sessão.
3. Um componente cliente mantém o passo atual em memória, envia cada resposta
   e renderiza perguntas e comparação.
4. A navegação pública adiciona a aba e a nova rota, mantendo CTB e POPs
   separados.

## Privacidade e cache

- O payload passa por `filterPII` antes de busca, logs ou processamento.
- A API não grava descrição nem respostas no banco.
- A rota personalizada permanece `network-only` no service worker.
- Nenhum resultado do assistente é armazenado no cache compartilhado.
- Sair da rota ou recarregar elimina a sessão no cliente.

## Verificação

- Testes unitários do ranking e geração de perguntas.
- Casos com códigos completos, compactos, inexistentes e parciais.
- Pares ambíguos, como celular segurado/manuseado e alcoolemia/recusa.
- Respostas `sim`, `não`, `não informado` e contraditórias.
- Testes de API para filtro de PII e ausência de persistência/IA.
- Testes de componente para navegação, teclado, ditado, estados vazios e
  comparação acessível.
- Regressão completa, typecheck, build de produção e política PWA.

## Critérios de aceite

- O assistente funciona com as fichas locais e sem chave de IA.
- O usuário inicia pela descrição livre da ocorrência.
- Perguntas vêm apenas do conteúdo oficial das fichas candidatas.
- Até três possibilidades são comparadas sem seleção automática.
- Código MBFT exato preserva sua identidade.
- Descrição e respostas não sobrevivem à sessão da página.
- Nenhuma orientação é criada sem fonte oficial.
