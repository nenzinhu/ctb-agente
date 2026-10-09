# Avaliação, reranking e classificação de intenção

## Objetivo

Melhorar a recuperação de CTB, fichas MBFT, POPs e naturezas PMSC em consultas operacionais, mantendo identificadores exatos seguros e usando IA somente quando o ranking local for ambíguo. A nova recuperação só poderá ser ativada se atingir Hit@3 mínimo de 95% no conjunto reservado e não causar nenhuma regressão em códigos, artigos ou números de POP exatos.

## Escopo

Esta etapa entrega os três primeiros aprimoramentos do RAG:

1. conjunto de avaliação com consultas anonimizadas do Supabase e casos controlados do acervo;
2. reranking dos candidatos recuperados;
3. classificação da intenção da consulta.

Não fazem parte desta etapa mudanças no modelo de embeddings, fine-tuning, novos metadados no banco, telemetria de cliques ou fallback adicional de embeddings.

## Classificação de intenção

Um classificador determinístico identifica uma das intenções:

- `codigo`: código MBFT explícito;
- `artigo`: artigo, parágrafo ou inciso explícito;
- `pop`: número ou pergunta sobre procedimento POP;
- `infracao`: descrição de conduta de trânsito;
- `natureza_pmsc`: descrição de fato ou natureza de ocorrência;
- `consulta_geral`: consulta sem sinal suficiente para uma classe mais específica.

Identificadores explícitos continuam sendo resolvidos por correspondência exata. Eles não passam por correção aproximada nem por decisão de IA. Uma referência inexistente retorna ausência de resultado, nunca o identificador mais próximo.

O classificador retorna a intenção, a confiança e os sinais usados na decisão. Consultas ambíguas podem manter mais de uma intenção candidata, mas uma referência exata sempre prevalece.

## Recuperação e reranking

A recuperação lexical e vetorial existente continua gerando os candidatos. O reranker local recebe, para cada candidato:

- posição e score lexical;
- posição e similaridade vetorial, quando disponível;
- cobertura dos conceitos da consulta;
- correspondência em campos relevantes, como título, código, artigo, seção e natureza;
- coleção de origem;
- compatibilidade com a intenção classificada;
- correspondência exata de identificador.

Esses sinais são normalizados antes da combinação. Pesos ficam centralizados por coleção e intenção, para evitar constantes dispersas. A saída inclui score final e motivos de ordenação para auditoria e testes.

Identificadores exatos têm precedência absoluta. Para consultas descritivas, o reranker local reordena uma quantidade limitada de candidatos recuperados. Resultados abaixo de uma confiança mínima não são promovidos apenas por proximidade vetorial.

## Reranking por IA

A IA é usada somente quando o ranking local for ambíguo, por exemplo quando os primeiros candidatos têm scores próximos ou confiança baixa. Ela recebe a consulta já filtrada e no máximo dez candidatos com IDs e pequenos trechos.

A resposta deve seguir um esquema estruturado contendo apenas IDs fornecidos. Qualquer ID desconhecido invalida a resposta. A IA não pode criar artigo, código MBFT, POP ou natureza PMSC.

Haverá timeout curto. Falha de rede, resposta inválida, indisponibilidade de provedor ou estouro de tempo retorna imediatamente ao ranking local. O resultado registra se houve reranking por IA e qual provedor/modelo foi usado, sem transformar a IA em dependência obrigatória da busca.

## Conjunto de avaliação

O conjunto combina duas fontes:

1. consultas reais do Supabase, exportadas sem IP e submetidas ao filtro de dados pessoais;
2. casos controlados derivados do CTB, MBFT, POPs e fatos PMSC.

Consultas repetidas são agrupadas, preservando frequência e categoria de linguagem. Uma consulta real só entra no conjunto versionado depois de anonimização e revisão de uma ou mais fontes aceitáveis. O repositório não recebe a consulta original nem identificadores pessoais.

Os casos devem incluir:

- códigos MBFT em formatos variados;
- artigos, parágrafos e incisos;
- números de POP;
- frases naturais, abreviações, gírias, erros e palavras incompletas;
- negações e diferenças operacionais relevantes;
- situações ambíguas com múltiplas respostas aceitáveis;
- consultas fora do domínio e identificadores inexistentes.

O conjunto é dividido entre desenvolvimento e teste reservado. Paráfrases ou variações do mesmo fato não podem ficar em divisões diferentes. A meta inicial é de 100 a 200 consultas revisadas; se ainda não houver consultas reais suficientes, casos controlados completam a cobertura sem serem apresentados como dados reais.

## Métricas e ativação

Um comando reproduzível compara o ranking atual com o candidato usando a mesma versão do corpus. O relatório apresenta separadamente CTB/MBFT, POPs e fatos PMSC, além do total.

Métricas obrigatórias:

- Hit@1;
- Hit@3;
- MRR;
- taxa de falsos positivos em casos negativos;
- cobertura por intenção e coleção;
- latência mediana e p95;
- quantidade de consultas que acionam IA e taxa de fallback.

Critérios de ativação:

- Hit@3 global e por coleção de pelo menos 95% no teste reservado;
- nenhuma regressão em código MBFT, artigo/inciso ou número POP explícito;
- nenhum aumento de falso positivo em consultas negativas;
- fallback local funcional quando embeddings ou IA falharem.

Se qualquer critério falhar, o ranking atual permanece ativo e o relatório indica os casos que bloquearam a mudança.

## Privacidade e observabilidade

O pipeline remove dados pessoais antes de persistir ou enviar consultas a provedores. Não são armazenados IP, nome, CPF, telefone, placa ou o texto original que contenha esses dados.

Registros técnicos podem guardar intenção, coleção, IDs recuperados, scores, latência, uso de IA e provedor/modelo. Esses dados permitem auditar o ranking sem reconstruir informações pessoais.

## Limites e falhas

- Sem embeddings, a busca e o reranking local continuam com sinais lexicais.
- Sem IA, a ordenação local é a resposta final.
- Resposta estruturada inválida da IA é descartada integralmente.
- Catálogo ou banco indisponível preserva os fallbacks já existentes.
- Consultas sem confiança suficiente retornam ausência ou alternativas para conferência, sem decisão automática.

## Verificação

Os testes cobrem classificação de cada intenção, prioridade de identificadores exatos, ordenação local, empate ambíguo, validação dos IDs da IA, timeout, falha de embeddings, falha de provedor e casos negativos.

A verificação final inclui:

- testes unitários e de integração;
- execução do benchmark e validação dos critérios de ativação;
- suíte completa do projeto;
- `npm run typecheck`;
- `npm run build`.

Fine-tuning permanece fora desta etapa. Ele só será considerado após os resultados do conjunto reservado demonstrarem uma lacuna que não seja resolvida por recuperação, reranking ou prompts.
