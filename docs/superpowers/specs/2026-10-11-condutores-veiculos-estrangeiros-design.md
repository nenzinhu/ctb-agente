# Condutores e Veículos Estrangeiros — especificação de design

## Objetivo

Criar a aba **Condutores e Veículos Estrangeiros** para apoiar o agente de campo na fiscalização de condutores habilitados no exterior e veículos registrados fora do Brasil. A ferramenta deve identificar documentos e condições aplicáveis, apresentar acordos internacionais confirmados, apontar possíveis infrações do CTB/MBFT e orientar providências sem transformar inferências da IA em fundamento legal.

O escopo migratório e aduaneiro fica limitado ao que altera diretamente a fiscalização de trânsito: prazo de permanência relevante, validade da habilitação, admissão temporária do veículo, documentos exigíveis e encaminhamento ao órgão competente. A aba não será um sistema geral de imigração.

## Princípios

1. Identificadores legais e códigos MBFT são exatos e nunca passam por correção aproximada.
2. Toda conclusão operacional deriva de uma regra estruturada com fonte oficial, vigência e data de conferência.
3. O RAG explica e cita; não cria acordos, prazos, equivalências ou infrações.
4. Ausência de acordo cadastrado não significa inexistência de acordo: o resultado será `requer_conferencia`.
5. Ambiguidade gera perguntas de esclarecimento ou alternativas visíveis em linhas separadas.
6. O recurso deve continuar útil sem provedor de IA: o motor determinístico e o catálogo oficial são a base da resposta.
7. Conteúdo novo entra como `revisar` e somente uma revisão humana pode promovê-lo a `confirmada`.

## Nome e navegação

- Rota: `/estrangeiros`.
- Nome completo: **Condutores e Veículos Estrangeiros**.
- Rótulo curto no cabeçalho: **Estrangeiros**.
- No mobile, a entrada ficará no menu **Ferramentas**.
- A tela seguirá os componentes, tokens de cor, acessibilidade e comportamento responsivo já usados pelo aplicativo.

## Experiência de consulta

### Entrada principal: assistente guiado

O agente responde progressivamente:

1. **País e situação da pessoa**
   - nacionalidade;
   - país emissor da habilitação;
   - condição declarada relevante ao trânsito, como visitante ou residente;
   - data de entrada ou tempo de permanência no Brasil, quando necessário para a regra.
2. **Habilitação**
   - documento estrangeiro apresentado e validade;
   - categoria indicada;
   - Permissão Internacional para Dirigir, quando apresentada;
   - tradução, quando apresentada ou exigível;
   - documento de identificação;
   - veículo conduzido e compatibilidade de categoria.
3. **Veículo**
   - registro brasileiro ou estrangeiro;
   - país da placa;
   - proprietário e vínculo com o condutor;
   - ingresso temporário e documentos apresentados;
   - seguro aplicável;
   - uso particular, transporte de carga ou transporte de passageiros.

Campos que não participam da regra selecionada não serão exibidos. O assistente não exigirá dados pessoais como nome, documento ou placa.

### Entrada secundária: busca livre

A mesma aba aceitará frases como:

- `argentino com carteira vencida`;
- `carro uruguaio sem seguro`;
- `estrangeiro residente com habilitação do exterior`;
- `pid vencida`;
- `sem tradução`.

A busca reutilizará normalização, sinônimos, abreviações, meias-palavras e tolerância a erros do aplicativo. Ela preencherá sinais do assistente e solicitará os dados que faltarem antes de concluir.

### Resultado

O resultado será composto por blocos visíveis, sem dropdown:

- **Situação analisada**: resumo apenas dos fatos informados.
- **Documentos e condições**: itens aceitos, ausentes ou que exigem conferência.
- **Base internacional**: convenção, acordo ou reciprocidade confirmada, com países abrangidos.
- **Possíveis enquadramentos**: ficha MBFT, artigo, código, condição necessária e motivo da correspondência.
- **Medidas e providências**: somente as previstas na fonte oficial, incluindo encaminhamento a outro órgão quando aplicável.
- **Fontes**: órgão, norma, artigo, versão, vigência, data de conferência e ligação oficial.

Cada conclusão terá um dos estados:

- `confirmada`: regra vigente e revisada por humano;
- `requer_conferencia`: informação insuficiente, fonte ausente, conflito ou regra pendente de revisão;
- `nao_aplicavel`: regra descartada pelos fatos informados.

Esses são **estados do resultado da consulta**. Eles não substituem a situação editorial da regra ou do documento (`confirmada`, `revisar` ou `substituida`): uma regra em revisão nunca poderá produzir um resultado `confirmada`.

## Arquitetura

### Catálogo determinístico

Um catálogo versionado no repositório será a fonte operacional da decisão. Ele conterá países, grupos de países, documentos, condições, acordos, requisitos e referências às fichas MBFT. O aplicativo poderá carregá-lo sem banco ou IA, preservando velocidade e uso offline.

O catálogo será dividido em unidades independentes:

- países e grupos de acordos;
- documentos e equivalências;
- regras para condutores;
- regras para veículos;
- possíveis infrações e medidas;
- fontes oficiais e histórico de revisão.

### Motor de decisão

O motor receberá fatos estruturados e devolverá:

- perguntas pendentes;
- regras satisfeitas ou descartadas;
- alternativas quando os fatos admitirem mais de um enquadramento;
- referências oficiais;
- nível de confiança baseado em completude e revisão da regra.

O motor não realizará chamadas externas nem chamará modelos de IA. As funções serão puras e testáveis com tabelas de casos.

### RAG oficial

Será criada a coleção `estrangeiros` na base documental. O RAG recuperará trechos das fontes oficiais para explicar resultados determinísticos e responder dúvidas complementares.

A implementação incluirá uma migração idempotente para autorizar `estrangeiros` nas restrições e funções do banco que hoje enumeram coleções. A migração deverá preservar as coleções existentes e ser coberta por uma verificação de esquema.

- A busca textual usará a consulta expandida.
- A busca vetorial usará a consulta original em português.
- O reranking priorizará país, tipo de documento, acordo e referência legal compatíveis com os fatos estruturados.
- Trechos de documentos `revisar` poderão ser exibidos apenas com aviso e não poderão transformar uma regra em `confirmada`.

### API

`POST /api/estrangeiros/consultar` receberá uma consulta guiada ou livre e retornará:

- fatos reconhecidos;
- perguntas de esclarecimento;
- resultado operacional;
- possíveis infrações;
- fontes citadas;
- estado de revisão.

O contrato rejeitará datas inválidas e valores fora do catálogo, mas permitirá respostas parciais para produzir perguntas de esclarecimento.

## Modelo de dados

### Regra operacional

Cada regra terá, no mínimo:

- identificador estável;
- domínio `condutor`, `veiculo`, `transporte` ou `encaminhamento`;
- países ou grupo de países;
- fatos necessários e fatos impeditivos;
- conclusão operacional;
- documentos exigidos;
- códigos MBFT candidatos e respectivas condições;
- medida ou providência;
- identificadores das fontes;
- situação `confirmada`, `revisar` ou `substituida`;
- data da última revisão humana.

### Fonte oficial

Cada fonte terá:

- órgão emissor;
- título e identificador oficial;
- artigo ou seção;
- URL oficial;
- versão e vigência;
- data de conferência;
- hash do conteúdo indexado;
- situação documental.

### Acordo

Cada acordo terá:

- nome oficial;
- instrumento de incorporação no Brasil;
- países abrangidos;
- documentos e situações cobertos;
- início e fim de vigência, quando houver;
- condições ou reservas;
- fontes oficiais;
- situação de revisão.

Não será criada uma lista manual de “países aceitos” sem vínculo com um acordo ou norma oficial.

## Fontes e governança documental

O corpus inicial deverá ser montado somente a partir de portais oficiais e incluir:

- texto compilado vigente do CTB;
- fichas vigentes do MBFT relacionadas a habilitação, documentação, registro, licenciamento, retenção, remoção e liberação;
- normas CONTRAN vigentes sobre habilitação emitida no exterior e circulação de veículos estrangeiros;
- convenções multilaterais incorporadas ao direito brasileiro;
- normas e acordos do Mercosul incorporados no Brasil;
- acordos bilaterais oficialmente promulgados;
- atos oficiais de Polícia Federal e Receita Federal apenas quando afetarem a fiscalização viária.

Antes de qualquer regra aparecer como `confirmada`, a aquisição deve registrar o identificador oficial, o artigo aplicável, a URL oficial, a vigência e a conferência humana. Fontes encontradas apenas em blogs, resumos, páginas comerciais ou respostas de IA não entram no catálogo.

## Tratamento de ambiguidades e erros

- País ausente: perguntar país emissor e, se necessário, país da placa.
- Prazo desconhecido: explicar por que a data é necessária e não concluir validade.
- Acordo não cadastrado: responder `requer_conferencia`, sem afirmar inexistência.
- Documento vencido ou categoria incompatível: apresentar possíveis enquadramentos condicionais, nunca autuação automática.
- Divergência entre catálogo e RAG: o catálogo controla a conclusão; o conflito é exibido e registrado para revisão.
- Banco ou IA indisponível: manter o assistente determinístico e informar que a explicação documental ampliada está temporariamente indisponível.
- Código ou artigo inexistente: retornar ausência exata, sem fuzzy matching numérico.

## Administração e revisão

O painel administrativo ganhará uma seção para:

- indexar fontes da coleção `estrangeiros`;
- listar regras e acordos com estado de revisão;
- conferir fontes e datas;
- promover conteúdo de `revisar` para `confirmada`;
- substituir regras preservando histórico;
- executar auditoria de fontes sem vetor, vencidas ou conflitantes.

A aplicação de mudanças no catálogo continuará versionada em Git. A promoção de documentos no banco seguirá a revisão humana já existente.

O painel promoverá a **situação documental** no banco. Regras operacionais e vínculos com acordos somente mudarão por revisão do catálogo versionado, mantendo rastreabilidade entre a decisão, a fonte e o commit que a introduziu.

## Desempenho e operação offline

- Catálogo e índices lexicais serão carregados uma vez por processo.
- O assistente determinístico responderá sem rede.
- RAG textual e vetorial terá timeout independente e fallback parcial.
- O catálogo estruturado será incluído na política de cache/PWA; documentos integrais não serão armazenados indiscriminadamente no dispositivo.
- A consulta não fará chamadas externas por país durante a abordagem.

## Testes e critérios de aceite

### Testes unitários

- seleção de regras por país, grupo e documento;
- cálculo de perguntas pendentes;
- visitante versus residente quando juridicamente relevante;
- habilitação válida, vencida, incompatível ou sem informação suficiente;
- veículo brasileiro versus estrangeiro;
- acordo vigente, substituído, ausente ou pendente de revisão;
- mapeamento condicional para ficha MBFT;
- abreviações, sinônimos, meias-palavras e erros em português;
- rejeição de correção aproximada em códigos e artigos.

### Testes de integração

- contrato da API e validação parcial;
- combinação entre motor determinístico e RAG;
- fallback sem IA, vetor ou banco;
- separação da coleção `estrangeiros` das bases CTB e POP;
- auditoria e promoção humana no painel.

### Testes de interface

- fluxo completo por teclado e leitor de tela;
- perguntas condicionais;
- alternativas em linhas visíveis;
- fontes e avisos em mobile;
- navegação por cabeçalho e menu de ferramentas.

### Aceite funcional

1. Uma consulta completa retorna regra, possíveis infrações e fontes sem depender de IA.
2. Uma consulta incompleta pede esclarecimento em vez de adivinhar.
3. País sem regra confirmada gera `requer_conferencia`.
4. Toda conclusão confirmada cita ao menos uma fonte oficial vigente e revisada.
5. Códigos MBFT e artigos permanecem exatos.
6. O fluxo funciona em telas móveis e mantém uma resposta operacional quando offline.

## Fora de escopo

- decisão sobre regularidade migratória sem impacto na fiscalização de trânsito;
- consulta a bases pessoais da Polícia Federal, Receita Federal ou órgãos estrangeiros;
- validação automática da autenticidade física de documentos;
- tradução juramentada automática;
- atualização jurídica automática sem revisão humana;
- conclusão de autuação exclusivamente por IA.
