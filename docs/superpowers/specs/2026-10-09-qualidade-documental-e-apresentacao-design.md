# Qualidade documental e apresentação institucional

Data: 9 de outubro de 2026<br>
Status: projeto aprovado em conversa; aguardando revisão da especificação escrita

## 1. Objetivo

Transformar a qualidade das bases do CTB, das fichas do MBFT e dos POPs em algo mensurável, auditável e fácil de manter. O aplicativo deve continuar rápido e resiliente para o agente em campo, inclusive quando IA, vetores ou banco estiverem temporariamente indisponíveis.

Também será incluída uma apresentação institucional clara do produto e o crédito global:

> CTB Agente — desenvolvido pelo Cabo Jeferson

Não será prometida precisão jurídica de 100%. A interface mostrará indicadores verificáveis, a versão das fontes e a data da última conferência.

## 2. Público e princípios

O público principal é o agente em campo que precisa sanar dúvidas no momento da atuação. As decisões do projeto seguem estes princípios:

- a consulta deve chegar primeiro; animações e diagnósticos não podem atrasá-la;
- toda resposta sobre enquadramento ou procedimento precisa apontar para uma fonte oficial consultável;
- a IA organiza e explica, mas não substitui CTB, MBFT, POP ou revisão humana;
- ausência de vetor não impede busca textual;
- ausência de IA não impede exibição da ficha ou do trecho oficial;
- quando nenhuma fonte sustentar a resposta, o aplicativo informará que não encontrou base oficial e pedirá mais detalhes, sem apresentar conhecimento geral da IA como orientação operacional;
- a situação da base será expressa por métricas, não por uma afirmação genérica de perfeição.

## 3. Escopo

### Incluído

- metadados obrigatórios de origem, versão, vigência e conferência;
- diagnóstico administrativo separado para CTB, MBFT e POP;
- verificação de cobertura vetorial, integridade e duplicidade;
- conjunto versionado de consultas de referência;
- medição de Hit@1, Hit@3 e latência;
- estado consolidado “Base pronta para consulta”;
- ações administrativas para corrigir pendências;
- bloco institucional na página inicial;
- rodapé global com o crédito ao desenvolvedor;
- entrada visual sutil da página inicial usando GSAP;
- testes unitários, de integração, de componente e fluxo completo.

### Não incluído

- treinamento ou ajuste fino de modelos;
- garantia de acerto jurídico de 100%;
- substituição automática de documentos oficiais;
- coleta de consultas reais com dados pessoais;
- migração de todo o corpus para execução exclusivamente offline;
- animações contínuas, parallax ou efeitos que prejudiquem desempenho em celular.

## 4. Arquitetura

A solução terá quatro unidades independentes.

### 4.1 Metadados documentais

A migração `scripts/migrations-011-document-quality.sql` adicionará à tabela `documentos`:

- `fonte_oficial TEXT`;
- `versao TEXT`;
- `vigente_desde DATE`;
- `conferido_em DATE`;
- `situacao TEXT`, limitada a `vigente`, `revisar` ou `substituido`.

As colunas serão inicialmente anuláveis para preservar documentos já cadastrados. Registros antigos ficarão automaticamente com estado de revisão pendente. Novos envios deverão informar fonte, versão, vigência e data de conferência.

O MBFT e os POPs empacotados no aplicativo terão um manifesto versionado no repositório, separado do conteúdo extraído. O manifesto guardará a mesma informação de origem. Quando a versão real não puder ser comprovada, o campo ficará explicitamente como `não informado` e o diagnóstico indicará “Revisão necessária”; nenhuma data será inventada.

### 4.2 Diagnóstico e histórico

A mesma migração criará `diagnosticos_base`, acessível somente no servidor e no painel autenticado:

- `id UUID`;
- `colecao TEXT`, limitada a `ctb`, `mbft` ou `pop`;
- `status TEXT`, limitada a `pronta`, `atencao` ou `critica`;
- `metricas JSONB`;
- `detalhes JSONB`;
- `duracao_ms INTEGER`;
- `executado_em TIMESTAMPTZ`.

O código de domínio ficará em `lib/quality/`. Cada verificador terá uma responsabilidade única:

- metadados e vigência;
- cobertura de vetores;
- integridade dos trechos;
- duplicidade;
- consultas de referência;
- consolidação do estado.

O histórico permitirá comparar diagnósticos sem alterar o caminho crítico da consulta pública.

### 4.3 Consultas de referência

Um arquivo versionado, por exemplo `data/quality/search-cases.json`, definirá casos curados para CTB, MBFT e POP. Cada caso terá:

- identificador estável;
- coleção;
- consulta em português do Brasil;
- categoria: código, artigo, frase comum, abreviação, fragmento, erro de digitação, sinônimo ou gíria;
- resultado oficial esperado;
- posição máxima aceitável.

Os casos não conterão placas, CPF, CNH, nomes de envolvidos ou qualquer outro dado pessoal. A suíte inicial deverá representar os fluxos de maior uso e poderá crescer com falhas reais previamente anonimizadas e revisadas.

### 4.4 Interface administrativa

A seção atual de RAG será ampliada com “Qualidade das bases”. Haverá um cartão para CTB, MBFT e POP contendo:

- fonte, versão, vigência e última conferência;
- documentos, fichas e trechos;
- percentual de trechos vetorizados;
- trechos vazios, excessivamente pequenos ou sem estrutura reconhecida;
- possíveis duplicidades;
- Hit@1 e Hit@3;
- tempo médio e pior tempo observado;
- data e resultado do último diagnóstico.

As ações serão contextuais:

- **Executar testes**: roda o conjunto de referência;
- **Gerar vetores pendentes**: reutiliza o fluxo existente;
- **Revisar documento**: leva ao documento e seus metadados;
- **Reenviar documento**: usado quando o arquivo original precisa ser reprocessado;
- **Reindexar base local**: disponível apenas para os corpus empacotados, cuja fonte está no repositório.

Não haverá um botão enganoso de reindexação para arquivos enviados que já foram removidos do armazenamento temporário.

## 5. Critério “Base pronta para consulta”

Uma coleção receberá o selo verde somente quando todos os critérios abaixo forem verdadeiros:

- todos os documentos têm fonte, versão e data de conferência;
- nenhum documento vigente está marcado para revisão;
- 100% dos trechos têm vetor quando a busca semântica estiver configurada;
- não existe erro crítico de leitura, estrutura ou duplicidade;
- 100% das consultas de referência encontram o resultado esperado entre os três primeiros;
- pelo menos 90% encontram o resultado esperado em primeiro lugar;
- a busca textual de cada caso termina dentro de 1,5 segundo.

Quando a busca semântica não estiver configurada, o diagnóstico mostrará “Busca textual pronta; busca semântica indisponível”, sem fingir que a cobertura vetorial foi aprovada.

Estados:

- **Pronta**: todos os critérios aplicáveis passaram;
- **Atenção**: consulta funciona, mas há metadados, vetores ou metas não críticos pendentes;
- **Crítica**: arquivo ilegível, base vazia, esquema ausente ou casos oficiais fundamentais não encontrados.

## 6. API e fluxo de dados

### Leitura do diagnóstico

`GET /api/admin/quality` exigirá sessão administrativa e devolverá o último diagnóstico das três coleções. A resposta será pequena e não executará testes pesados.

### Execução

`POST /api/admin/quality` exigirá sessão administrativa e aceitará uma coleção. O servidor:

1. valida a sessão e a coleção;
2. carrega metadados e contagens;
3. executa verificadores independentes;
4. roda os casos de referência com limites de tempo;
5. consolida as métricas;
6. grava o histórico;
7. devolve o resultado ao painel.

Uma falha em um verificador será registrada como item do diagnóstico. Ela não derrubará os demais verificadores nem qualquer rota pública.

### Envio de documento

O formulário administrativo ganhará campos para fonte, versão, vigência e conferência. A validação ocorrerá no navegador para orientação imediata e novamente no servidor. O conteúdo será indexado somente depois da validação.

Documentos antigos continuarão consultáveis após a migração, mas aparecerão como pendentes de revisão até receberem os metadados.

## 7. Página inicial e rodapé

O topo da página inicial usará o texto aprovado:

- selo: **Ferramenta operacional para agentes de campo**;
- título: **CTB Agente**;
- descrição: **Aplicativo de apoio ao agente em campo para consultar rapidamente o CTB, as fichas do MBFT e os POPs, esclarecer dúvidas e conferir a fonte oficial antes da atuação.**;
- aviso: **Ferramenta de apoio. A decisão e o procedimento devem observar a norma e o documento vigente.**

Um componente `Footer` será renderizado pelo layout global, abaixo do conteúdo, com:

> CTB Agente — desenvolvido pelo Cabo Jeferson

O rodapé também repetirá, em texto discreto, que o aplicativo é apoio à consulta e que a fonte vigente deve ser conferida.

## 8. Animação GSAP

GSAP será adicionado como dependência de produção e ficará isolado em um pequeno componente cliente usado apenas na página inicial.

Comportamento:

- animação executada uma única vez na montagem;
- selo, título e descrição entram com opacidade de 0 para 1 e deslocamento vertical aproximado de 12 px;
- formulário, guia e atalhos entram em sequência curta;
- duração curta, sem repetição e sem bloquear interação;
- nenhum parallax, brilho contínuo ou animação do resultado da consulta;
- `gsap.context()` fará o escopo e a limpeza ao desmontar;
- `gsap.matchMedia()` respeitará `prefers-reduced-motion: reduce` e mostrará o estado final imediatamente;
- conteúdo e formulário existirão no HTML antes da animação, preservando acessibilidade e renderização no servidor.

A animação não será carregada nas rotas de consulta, POP, Professor Emérito ou painel. O impacto no pacote inicial será medido durante a compilação.

## 9. Segurança, privacidade e resiliência

- todas as rotas de diagnóstico e alteração exigem sessão administrativa;
- tabelas de diagnóstico não terão leitura anônima;
- nenhum segredo será retornado pela API;
- consultas de referência não terão dados pessoais;
- erros do provedor vetorial serão convertidos em diagnóstico, não em falha da busca textual;
- timeout individual impedirá que um caso lento bloqueie toda a execução;
- o estado anterior continuará disponível se uma nova execução falhar;
- o aplicativo público seguirá funcionando enquanto a migração 011 estiver pendente.

## 10. Testes e validação

### Unidade

- validação e normalização dos metadados;
- cálculo dos critérios `pronta`, `atencao` e `critica`;
- cálculo de Hit@1, Hit@3 e latência;
- detecção de trechos inválidos e duplicados;
- leitura do manifesto local;
- casos de redução de movimento da animação.

### API e integração

- sessão obrigatória;
- leitura do último diagnóstico;
- execução parcial quando um verificador falha;
- persistência do histórico;
- compatibilidade quando a migração 011 ainda não foi aplicada;
- novos campos obrigatórios no envio;
- manutenção da busca textual quando vetores estão indisponíveis.

### Componentes

- cartões das três coleções e seus estados;
- avisos de vigência e vetor pendente;
- ações corretivas corretas para base local e documento enviado;
- conteúdo institucional e crédito;
- animação sem ocultar conteúdo quando JavaScript ou movimento estão desativados.

### Verificação final

- suíte Jest completa;
- verificação TypeScript;
- compilação de produção;
- fluxo Playwright principal;
- comparação do tamanho do pacote inicial da página inicial;
- execução dos casos de referência em uma base de teste;
- teste manual em largura de celular e nos modos claro, escuro e alto contraste.

## 11. Implantação

1. publicar código compatível com migração ausente;
2. aplicar a migração 011 no Supabase;
3. preencher os metadados dos documentos existentes;
4. conferir o manifesto das bases locais;
5. gerar vetores pendentes;
6. executar o primeiro diagnóstico;
7. corrigir casos reprovados;
8. somente então exibir o selo “Base pronta para consulta”.

O selo nunca será ativado manualmente: ele deriva dos indicadores do último diagnóstico válido.

## 12. Critérios de aceite

- a página inicial explica claramente o uso por agentes em campo;
- o crédito ao Cabo Jeferson aparece em todas as páginas;
- a animação é sutil, roda uma vez e respeita redução de movimento;
- CTB, MBFT e POP têm diagnóstico separado;
- documentos novos exigem origem, versão, vigência e conferência;
- documentos antigos não deixam de funcionar, mas ficam marcados para revisão;
- o painel mostra cobertura vetorial, integridade, duplicidade, Hit@1, Hit@3 e latência;
- falha de IA, vetor ou diagnóstico não impede a busca textual nem a consulta local;
- o estado “Base pronta para consulta” é calculado, auditável e acompanhado da data da última verificação.
