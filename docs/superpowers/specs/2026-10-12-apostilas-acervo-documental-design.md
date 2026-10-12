# Apostilas didáticas a partir de todo o acervo — especificação de design

## Objetivo

Ampliar a aba **Apostilas** para que agentes possam criar material didático a partir de qualquer documento anexado e indexado no acervo, não apenas fichas do MBFT e POPs. O usuário poderá pesquisar um documento, escolher o conteúdo integral ou uma ou mais faixas de páginas e gerar uma apostila em português do Brasil com rastreabilidade até o documento e as páginas utilizadas.

A interface e os prompts deixarão de usar “Agentes em formação” ou “policiais em formação”. O público técnico passará a ser identificado apenas como **Agentes**.

## Decisões aprovadas

- O resultado será uma apostila didática gerada pela IA, não uma reprodução visual das páginas originais.
- O catálogo incluirá documentos com situação `vigente` e `revisar`.
- Documentos em revisão serão identificados na seleção, na prévia e no PDF.
- Documentos `substituido` não poderão gerar novas apostilas.
- A seleção parcial aceitará intervalos livres, por exemplo `10–18, 35–40`.
- A opção “documento inteiro” utilizará todo o conteúdo indexado do documento.
- O PDF continuará usando o brasão rodoviário e o nome **Polícia Militar Rodoviária de Santa Catarina**.

## Experiência do usuário

### Etapa 1 — Documento

A primeira etapa deixará de apresentar somente os cartões “Fichas do MBFT” e “POPs da PMSC”. Ela oferecerá um catálogo pesquisável de documentos indexados.

Cada resultado mostrará:

- título;
- coleção em linguagem humana, como CTB, POP, fatos PMSC ou estrangeiros;
- quantidade de páginas, quando conhecida;
- situação `Vigente` ou `Em revisão`;
- indicação objetiva quando o documento não possui páginas indexadas suficientes para seleção por faixa.

A pesquisa aceitará partes do título e termos presentes no conteúdo indexado. A listagem inicial poderá mostrar os documentos mais recentes, sem exigir consulta. Os resultados serão linhas ou cartões visíveis, adequados a mobile, e não um menu dropdown.

Somente um documento será usado por geração. Isso evita misturar fontes de natureza e situação diferentes e torna a citação das páginas inequívoca.

### Etapa 2 — Conteúdo

Após escolher o documento, o usuário selecionará um dos modos:

1. **Documento inteiro**;
2. **Páginas selecionadas**.

No segundo modo, um campo aceitará faixas separadas por vírgula, como `3, 10–18, 35–40`. O aplicativo deverá:

- aceitar hífen comum e travessão;
- eliminar repetições e ordenar as páginas;
- rejeitar zero, números negativos, intervalos invertidos e páginas acima do total conhecido;
- informar quais páginas solicitadas não possuem texto indexado;
- exibir um resumo antes da geração, como `páginas 3, 10–18 e 35–40`.

Quando o total de páginas for desconhecido, o modo por páginas continuará disponível somente até a maior página efetivamente encontrada no índice, apresentada ao usuário como limite disponível.

### Etapa 3 — Gerar e revisar

O usuário informará o título da apostila ou aceitará o título sugerido com base no documento. O público técnico será apresentado apenas como **Agentes**. A opção de público leigo poderá permanecer, pois não conflita com a remoção de “Agentes em formação”.

Antes de chamar a IA, a tela mostrará:

- documento escolhido;
- páginas ou documento inteiro;
- situação documental;
- quantidade aproximada de partes que serão processadas.

A prévia apresentará capítulos em ordem, suas páginas de origem e o estado documental. O download gerará o PDF institucional.

## Arquitetura

### Catálogo público controlado

Será criado um endpoint de leitura específico para a aba Apostilas. Ele usará a credencial de servidor e devolverá somente os metadados necessários dos documentos `vigente` e `revisar`; não exporá hashes, nomes internos de armazenamento nem acesso administrativo.

O endpoint aceitará uma consulta textual opcional. A busca combinará:

- título e metadados do documento;
- correspondência textual nos trechos indexados;
- ordenação que prioriza título exato, título por prefixo e depois relevância do conteúdo.

O catálogo não dependerá da enumeração fixa MBFT/POP. Qualquer coleção já autorizada no sistema poderá aparecer quando tiver documento indexado e conteúdo recuperável.

### Recuperação por documento e página

Uma camada de repositório única esconderá a diferença física entre as tabelas atuais:

- documentos CTB/MBFT armazenados em `dispositivos`;
- POP e demais coleções armazenados em `documento_trechos`.

Ela receberá `documentoId` e seleção de páginas e devolverá trechos ordenados com:

- identificador do documento;
- título;
- coleção;
- seção;
- página;
- ordem;
- texto;
- situação documental.

Todas as consultas serão filtradas no servidor pelo `documento_id` escolhido. O cliente nunca enviará texto oficial livre para ser tratado como fonte.

### Migração de página dos trechos CTB

Será criada uma migração SQL idempotente que:

- adiciona a coluna `pagina` em `dispositivos`;
- cria índice por `documento_id`, `pagina` e `ordem`;
- mantém compatibilidade com trechos antigos, cuja página poderá permanecer nula;
- atualiza a ingestão de documentos CTB para persistir `chunk.page`.

A migração não inventará a página de conteúdo já indexado. Documentos antigos sem página deverão ser reindexados para habilitar intervalos precisos. Enquanto isso, poderão gerar apostila pelo modo **Documento inteiro**, com aviso de que as páginas não estão disponíveis.

### Preparação do conteúdo

O conteúdo recuperado será ordenado e agrupado em partes com tamanho limitado. O particionamento respeitará, nesta ordem:

1. páginas;
2. seções existentes;
3. limite seguro de caracteres/tokens.

Cada parte levará no prompt o título do documento, a situação e as páginas de origem. Para documento inteiro grande, as partes serão processadas em lotes com concorrência limitada, evitando disparar dezenas de chamadas simultâneas e respeitando o tempo máximo da Vercel.

O sistema imporá um limite operacional de conteúdo por geração. Se um documento exceder o que pode ser produzido com segurança em uma única requisição, a interface pedirá uma faixa menor em vez de truncar silenciosamente. O limite exato ficará centralizado em configuração e será coberto por testes.

### Geração didática

O prompt genérico produzirá, para cada parte:

- objetivos de aprendizagem;
- explicação fiel ao texto selecionado;
- pontos importantes para atuação do agente, quando o documento tiver conteúdo operacional;
- exemplos identificados como didáticos, sem inventar regras;
- questões de fixação;
- gabarito comentado;
- referência ao documento e às páginas utilizadas.

Regras obrigatórias do prompt:

- português do Brasil;
- não acrescentar códigos, artigos, prazos, valores ou procedimentos ausentes na fonte;
- distinguir texto da fonte de explicação didática;
- não afirmar que conteúdo `revisar` está vigente;
- não misturar conhecimento geral do modelo com a fonte selecionada.

Se a IA falhar, o fallback montará capítulos com o texto indexado, título, seção e páginas, sem adaptação. Nenhuma geração poderá retornar um capítulo vazio.

### Contratos de API

O fluxo utilizará contratos separados:

- listagem e pesquisa de documentos elegíveis;
- leitura do resumo de disponibilidade de páginas de um documento;
- geração da apostila com `documentoId`, modo e intervalos normalizados.

O pedido de geração não aceitará título de documento, situação ou conteúdo enviados pelo cliente como verdade. Esses dados serão recarregados no servidor pelo identificador.

Os erros terão mensagens em português para:

- documento inexistente ou substituído;
- documento sem trechos;
- página inválida ou não indexada;
- conteúdo acima do limite;
- banco não configurado;
- migração de páginas pendente;
- limite de uso atingido;
- indisponibilidade total dos modelos, quando também não for possível montar o fallback.

## PDF e identidade institucional

O PDF reutilizará o gerador institucional existente e terá:

- brasão `brasao-cpmrv.jpg`;
- nome **Polícia Militar Rodoviária de Santa Catarina**;
- título escolhido;
- documento de origem;
- páginas selecionadas ou indicação de documento inteiro;
- situação `Vigente` ou `Em revisão`;
- capítulos e referências de página;
- aviso de que a apostila auxilia a consulta e não substitui a fonte oficial nem a revisão humana.

O brasão e o nome aparecerão na capa e a identidade visual atual será preservada nas páginas internas. Apostilas baseadas em documento `revisar` terão aviso destacado na capa e na nota de cada capítulo.

## Segurança e qualidade documental

- Apenas documentos registrados no banco e com situação `vigente` ou `revisar` serão elegíveis.
- Documentos `substituido` serão excluídos no servidor mesmo que um identificador antigo seja enviado manualmente.
- A geração registrará documento, páginas, situação, modelo e tempo de resposta para auditoria, sem dados pessoais do usuário.
- A IA não poderá alterar a situação documental.
- O endpoint público não permitirá enumerar o texto integral arbitrariamente; devolverá conteúdo somente como parte da geração limitada e sujeita ao controle de taxa.
- A situação deverá ser consultada novamente no momento da geração para evitar uso de metadado desatualizado.

## Desempenho

- Pesquisa de catálogo limitada e paginada.
- Índices por situação/título e por documento/página/ordem.
- Trechos recuperados em uma consulta ordenada, sem uma consulta por página.
- Cache da geração incluirá hash do documento, páginas normalizadas, público e versão do prompt.
- Concorrência de IA limitada, com timeout por parte e fallback independente.
- O cliente receberá somente metadados e resultado final, nunca o corpus completo do catálogo.

## Compatibilidade

As fichas MBFT e os POPs continuarão disponíveis pelo catálogo documental. A implementação poderá manter temporariamente o contrato atual da API durante a transição, mas a interface nova usará identificadores de documento e páginas. Nenhum favorito, consulta do Professor ou busca operacional será alterado por esta funcionalidade.

O recurso será responsivo e seguirá os componentes e os padrões de acessibilidade já usados no aplicativo. Resultados, avisos e modos de seleção permanecerão visíveis em linhas/cartões, sem dropdown obrigatório.

## Testes

### Unitários

- normalização de `3, 10-18, 35–40`;
- rejeição de intervalos inválidos e fora do limite;
- deduplicação e ordenação de páginas;
- agrupamento de trechos por página e limite;
- prompt em português com documento, páginas e situação;
- fallback sem IA;
- aviso de documento em revisão;
- remoção completa de “Agentes em formação” e “policiais em formação” do fluxo.

### API e integração

- catálogo retorna somente `vigente` e `revisar`;
- `substituido` não pode ser gerado;
- pesquisa encontra documento por título e por conteúdo;
- recuperação funciona em `dispositivos` e `documento_trechos`;
- páginas CTB novas são persistidas pela ingestão;
- documento antigo sem páginas permite apenas modo inteiro;
- conteúdo excessivo é rejeitado sem truncamento silencioso;
- cache varia por documento, hash, páginas e público;
- controle de taxa e fallback continuam funcionando.

### Interface e PDF

- busca e escolha de documento por teclado;
- seleção de documento inteiro e intervalos livres;
- mensagens de validação acessíveis;
- fluxo completo em viewport mobile;
- prévia mostra páginas e situação;
- PDF contém brasão, nome institucional, origem, páginas e aviso de revisão;
- a opção técnica aparece como “Agentes”.

## Critérios de aceite

1. Um agente encontra por título ou assunto qualquer documento elegível indexado.
2. É possível gerar uma apostila didática do documento inteiro ou de intervalos válidos.
3. Cada capítulo identifica documento e páginas realmente utilizadas.
4. Conteúdo em revisão nunca é apresentado como vigente.
5. Documento substituído não pode gerar apostila.
6. A geração não usa texto fora do documento selecionado.
7. O PDF contém o brasão e “Polícia Militar Rodoviária de Santa Catarina”.
8. Nenhuma parte do fluxo exibe “Agentes em formação” ou “policiais em formação”.
9. Falha de IA produz conteúdo oficial rastreável em vez de apostila vazia.
10. A experiência é funcional e legível em desktop e mobile.

## Fora de escopo

- reprodução visual ou junção das páginas originais do PDF;
- edição manual avançada do conteúdo gerado;
- mistura de vários documentos em uma única geração;
- promoção automática de documentos para `vigente`;
- correção ou atualização jurídica automática;
- exposição pública do texto integral do banco documental.
