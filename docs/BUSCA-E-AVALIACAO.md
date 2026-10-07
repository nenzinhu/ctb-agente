# Busca, avaliação e fine-tuning

Para melhorar consultas com palavras incompletas e gírias, o primeiro passo é
ajustar a recuperação dos documentos. Esse ajuste escolhe melhor as fichas e os
POPs que já existem no aplicativo; não treina um modelo de linguagem.

## Base disponível e alcance

O checkout inclui 411 fichas MBFT em `data/acervo/mbft-fichas.json`, 144 POPs em
`data/acervo/pop-pmsc.json` e o texto compilado do CTB. As buscas nos dois manuais
funcionam sem Supabase ou chaves de IA. Os testes de consulta ao corpus em
`tests/unit/mbft-fichas.test.ts` e `tests/unit/pop-manual.test.ts` são a referência
para regressões; `tests/unit/search.test.ts` cobre sinônimos e a combinação dos
rankings da busca híbrida.

A busca do CTB indexado no Supabase combina palavras e vetores por Reciprocal
Rank Fusion. A parte vetorial usa `mistral-embed`, depende de
`MISTRAL_API_KEY` e de documentos indexados. Sem a chave, a busca por palavras
continua disponível quando o banco está configurado. A IA que redige respostas
é outra etapa e depende de pelo menos um provedor configurado.

## Ajuste da recuperação local

`lib/search/lexical.ts` compartilha o mecanismo de busca entre MBFT e POP:

- Normaliza maiúsculas e acentos, aceita prefixos de palavras com pelo menos
  quatro letras e pequenas variações verbais.
- Tolera erros de digitação em palavras longas, incluindo troca de letras
  vizinhas. Correspondências exatas recebem mais peso; números não são
  corrigidos por aproximação.
- Usa o vocabulário de `lib/search/sinonimos.ts` para ligar gírias aos termos dos
  manuais. Sinônimos do mesmo conceito não multiplicam sua pontuação.
- Considera o título, a raridade das palavras e a cobertura da consulta para
  ordenar os resultados. Se há correspondências que cobrem todos os conceitos,
  exclui alternativas que cobrem apenas parte da pergunta. Os índices dos
  manuais são reutilizados em memória.
- Preserva a busca direta por código MBFT, artigo/inciso e número POP. Um
  identificador completo ausente não é substituído por outro código parecido.
- Reconhece abreviações explícitas como `s/`, `c/`, `rec bafom` e `busc pess`.
  A negação de `s/` é preservada como `sem`, em vez de ser descartada.
- Não corrige por erro de digitação uma palavra que já existe no vocabulário:
  `segurando` não vira `segurança` para incluir uma ficha sem relação.

As alternativas de fichas e POPs aparecem em linhas selecionáveis com código
e descrição, sem dropdown. A seleção troca o documento exibido; não confirma
automaticamente que a infração ocorreu.

Nas fontes de POPs, se uma seção ultrapassa 1.800 caracteres, o recorte procura
uma janela contínua relacionada à pergunta, mantendo contexto e marcando cortes
com reticências. O texto da fonte não é reescrito. As respostas em cache usam
uma nova versão de chave para não reutilizar a ordenação anterior. Consultas
por código/artigo sem ficha não geram um identificador por IA; um número POP
explícito exige fonte com esse número e não usa o fallback de conhecimento geral.

O mecanismo tolerante a erros atua nos manuais locais. A expansão de sinônimos
também alimenta a busca textual do banco. Depois da migration 010, as RPCs do
Supabase aceitam prefixos, exigem cobertura mínima em consultas longas e cortam
vizinhos vetoriais com similaridade baixa; erros tipográficos continuam sendo
tratados com maior alcance pelo índice local. Essa distinção deve aparecer nos
resultados da avaliação.

## Como avaliar uma mudança

Separar **encontrar a fonte** de **redigir a resposta**. Uma resposta bem escrita
não corrige a escolha de uma ficha errada. Antes de mudar provedor ou prompt:

1. Fixar a versão do corpus e do código e registrar a consulta, os identificadores
   esperados, os primeiros resultados e o tempo de resposta.
2. Comparar a busca anterior e a candidata com o mesmo conjunto. Testar códigos,
   artigos/incisos, palavras sem acento, fragmentos, gírias, perguntas naturais e
   consultas sem relação com a base.
3. Medir **Hit@1** e **Hit@3**: proporção de consultas com pelo menos uma fonte
   esperada na primeira posição ou entre as três primeiras. Quando houver várias
   fontes obrigatórias, medir também a fração recuperada. Registrar respostas
   indevidas em casos negativos e latência mediana/p95.
4. Manter códigos e referências exatas corretos. Ganhos com gírias não devem
   esconder regressões em consultas precisas. Avaliar CTB/MBFT e POP separadamente.
5. Com IA habilitada, avaliar também se cada afirmação tem suporte no trecho
   citado, se as referências existem e se a ausência de base fica explícita.
   Executar essa etapa separadamente para não confundir uma falha de rede com
   uma falha de recuperação.

Casos iniciais, baseados no corpus e nas regressões existentes:

| Grupo | Consulta | Fonte esperada |
| --- | --- | --- |
| Código MBFT | `516-91` | ficha `516-91` |
| Artigo/inciso | `art. 181, XX` | fichas `762-51` e `762-52` |
| Situação | `dirigir segurando o celular` | ficha `763-31` |
| Sem acento | `sem cinto de seguranca` | ficha `518-51` |
| Gíria | `recusa do bafômetro` | ficha `757-90` |
| Número POP | `POP 002` | POP `002` |
| Pergunta natural | `Quando é permitido o uso de algemas?` | POP `003` |
| Procedimento | `barreira policial` | POP `105.1.1` |
| Ocorrência | `violência doméstica` | POP `201.4.6` |
| Negativo | `receita de bolo de chocolate` | nenhum resultado relevante |

`tests/unit/search-language.test.ts` acrescenta regressões de linguagem com a
fonte esperada entre os três primeiros resultados:

| Variação | Consultas | Fonte esperada |
| --- | --- | --- |
| Fragmento e erro | `segurando o celul`, `celualr` | ficha `763-31` |
| Gíria | `mexendo no zap` | ficha `763-32` |
| Gíria de campo | `recusou o bafo` | ficha `757-90` |
| Situação informal | `dar grau de moto` | ficha `705-61` |
| Fragmento | `estacion na calcada` | ficha `545-21` |
| Fragmento e erro POP | `algem`, `algmeas` | POP `003` |
| Fragmento e gíria POP | `busca pess`, `baculejo`, `revista pessoal` | POP `002` |
| Termo usual | `blitz` | POP `105.1.1` |
| Fragmento e nome popular | `violencia domest`, `maria da penha` | POP `201.4.6` |

Também há regressões para variantes de código (`51691`, `5169-1`,
`código 516 91`) e identificadores inexistentes (`516-99`, `art. 181, L`), que
não devem devolver uma ficha com outro código ou inciso como substituição.

`tests/unit/retrieval-tolerance.test.ts` amplia a cobertura com abreviações,
erros, consultas negativas, alternativas sem relação e recortes longos. São
regressões desenvolvidas junto do ajuste, não uma avaliação cega em perguntas
independentes. `tests/e2e/search-selection.test.ts` verifica no navegador a
consulta com erro e a seleção de linhas para MBFT e POP em desktop e celular.

Esses casos são um ponto de partida, não uma medida de qualidade geral.
Expandir para pelo menos 50 consultas revisadas, incluindo fragmentos e gírias
realmente usados pelos agentes. Guardar casos ambíguos com suas alternativas
aceitáveis, sem impor um único enquadramento quando faltam dados da situação.
O objetivo de 95% citado na especificação original é uma meta, não um resultado
já medido.

Para executar as regressões existentes sem serviços externos:

```bash
npm test -- --runInBand tests/unit/search.test.ts tests/unit/search-language.test.ts tests/unit/retrieval-tolerance.test.ts tests/unit/mbft-fichas.test.ts tests/unit/pop-manual.test.ts
```

## Quando considerar treinamento de um modelo

Não há conjunto de treinamento supervisionado nem pipeline de fine-tuning neste
repositório. Os documentos brutos não substituem pares revisados de consulta e
fonte relevante, ou de contexto e resposta correta. Nenhum modelo foi treinado
como parte deste ajuste de busca.

Se a avaliação mostrar falhas que a recuperação lexical e os embeddings atuais
não resolvem, coletar consultas sem dados pessoais e rotular as fontes corretas.
Para busca, comparar primeiro embeddings ou um reordenador de resultados; para
formato e estilo da resposta, comparar prompts antes de treinar o gerador.

Um experimento de treinamento exige modelo/provedor que suporte a operação,
credenciais, orçamento e dados revisados. Separar treino, validação e teste por
artigo, ficha ou POP: paráfrases da mesma pergunta não devem aparecer dos dois
lados. Registrar modelo, parâmetros, corpus e custo; só adotar a versão treinada
se superar a referência no conjunto reservado, preservando citações e casos
negativos. A legislação continua vindo dos documentos recuperados e atualizados.

Se o modelo de embeddings mudar, regenerar os vetores do corpus e verificar a
dimensão das colunas/RPCs do Supabase. Não misturar vetores de modelos diferentes
no mesmo índice.
