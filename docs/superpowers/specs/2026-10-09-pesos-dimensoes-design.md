# Pesos e Dimensões — desenho aprovado

**Data:** 9 de outubro de 2026  
**Estado:** definição funcional aprovada em conversa

## Objetivo

Criar uma área operacional para o agente de campo identificar a configuração de um caminhão ou CVC, calcular o limite regulamentar de PBT/PBTC, verificar excesso total e por eixo e receber o enquadramento, o valor estimado da autuação e a providência administrativa. A ferramenta deve explicar cada conclusão com fonte, artigo e página, sem usar IA para decidir números.

## Fontes e rastreabilidade

A primeira versão usa três fontes versionadas no repositório:

1. Resolução CONTRAN nº 882/2021 anexada pelo usuário, publicação do DOU de 24/12/2021, convertida para texto estruturado com marcadores de página;
2. CTB compilado já mantido em `data/acervo/ctb-lei-9503-compilado.txt`;
3. fichas MBFT já mantidas em `data/acervo/mbft-fichas.json`, especialmente os códigos 683-11, 683-12, 683-13, 688-20, 689-00 e 690-40.

Toda resposta mostrará título, versão, data de conferência, artigo e página. A interface não chamará a Resolução 882 isolada de “texto consolidado”: indicará a versão efetivamente carregada e alertará que alterações posteriores, limites técnicos, sinalização e AET podem impor limite menor. O catálogo normativo será substituível por fonte oficial mais recente sem alterar o motor de cálculo.

## Arquitetura

O recurso será dividido em unidades independentes:

- `data/pesos-dimensoes`: catálogo versionado de veículos, grupos de eixos, limites e fontes;
- `lib/pesos-dimensoes/calculadora`: funções puras de limite regulamentar, tolerância, excesso, enquadramento, responsabilidade e valor;
- `lib/pesos-dimensoes/rag`: segmentação e recuperação lexical dos artigos da Resolução, CTB e fichas MBFT;
- `components/pesos-dimensoes`: seletor visual, formulário guiado, desenho SVG e cartões de resultado;
- `/pesos-dimensoes`: página pública;
- `/api/pesos-dimensoes/consultar`: valida entrada, executa o cálculo determinístico e recupera os trechos usados na explicação;
- `/api/pesos-dimensoes/perguntar`: responde dúvidas em português com contexto recuperado e citações, sem recalcular ou substituir o resultado determinístico.

O motor não depende do banco ou de provedor de IA. O RAG funciona com índice local versionado; a IA apenas transforma os trechos recuperados em explicação. Se nenhum provedor estiver disponível, a tela conserva o cálculo e exibe os trechos oficiais diretamente.

## Experiência da calculadora

A aba aparecerá no cabeçalho desktop e em “Ferramentas” no mobile. O fluxo terá quatro etapas visíveis na mesma página:

1. **Escolha do veículo:** combobox acessível com linhas visíveis, desenho vetorial, nome popular, código de configuração e quantidade de eixos. A escolha permanece claramente visível após fechar a lista.
2. **Dados regulamentares:** comprimento, tara, PBT/PBTC técnico, CMT, limite sinalizado e, quando aplicável, limite da AET. Campos não pertinentes à configuração ficam ocultos.
3. **Forma de fiscalização:** “Nota/documento de transporte” ou “Balança”.
4. **Resultado:** limite regulamentar, carga útil máxima, peso apurado, tolerância de fiscalização, excesso autuável, códigos, valor estimado, responsável provável, medida administrativa e fontes.

Os desenhos serão SVGs próprios e esquemáticos. Cabine, unidades rebocadas, quantidade de eixos, eixos direcionais e conjuntos tandem/distanciados serão distinguíveis. Não serão usadas fotografias, marcas ou modelos comerciais.

O catálogo inicial abrangerá caminhão rígido de dois eixos, truck, bitruck, caminhão-trator com semirreboque nas configurações usuais, caminhão com reboque, bitrem, rodotrem e configuração especial com AET. Configurações especiais não determináveis com segurança serão marcadas para cálculo manual mediante os dados da AET, sem inventar um limite.

## Regras determinísticas

### Limite regulamentar

O limite utilizado é sempre o menor valor aplicável entre:

- limite legal da configuração e dos grupos de eixos;
- PBT/PBTC técnico informado pelo fabricante;
- CMT da unidade tratora;
- limite indicado por sinalização R-14/R-17;
- limite autorizado na AET.

A capacidade disponível para carga é `máximo(0, limite regulamentar - tara)`. A tolerância de fiscalização nunca será somada a esse valor nem apresentada como capacidade de carga.

### Documento fiscal

O peso final é `tara + peso bruto declarado da carga`. Não há tolerância sobre o peso declarado. Se o documento não contiver o peso em quilogramas, o sistema não conclui a autuação e orienta encaminhamento para pesagem ou apresentação de documento substituto. Sem tara confiável, o cálculo documental também será inconclusivo.

### Balança

Quando o PBT/PBTC é aferido por equipamento:

- aplica-se 5% sobre o limite regulamentar de PBT/PBTC para determinar o excesso autuável;
- aplica-se 12,5% sobre o menor limite legal/técnico de cada eixo ou grupo, quando a fiscalização por eixo for aplicável;
- para PBT/PBTC regulamentar igual ou inferior a 50 t, verifica-se inicialmente apenas o total; os eixos são verificados para autuação cumulativa quando o total ultrapassa a tolerância, conforme o art. 50 da Resolução 882;
- a tolerância não altera o limite permitido para carregamento.

O resultado distinguirá “dentro do limite”, “acima do limite, mas dentro da tolerância de fiscalização” e “excesso autuável”.

### Códigos

- `683-11`: excesso somente no PBT/PBTC;
- `683-12`: excesso somente por eixo;
- `683-13`: excessos simultâneos no PBT/PBTC e por eixo;
- `688-20`: CMT excedida em até 600 kg;
- `689-00`: CMT excedida de 601 kg a 1.000 kg;
- `690-40`: CMT excedida acima de 1.000 kg.

O sistema pode apresentar mais de um enquadramento quando houver excesso de CMT e de peso, explicando que a confirmação final cabe ao agente e às circunstâncias constatadas.

### Valor estimado

Para o art. 231, V, a multa parte de R$ 130,16. Para cada espécie de excesso autuável, calcula-se `teto(excesso / 200 kg)` e multiplica-se pelo valor unitário da faixa:

- até 600 kg: R$ 5,32;
- 601 a 800 kg: R$ 10,64;
- 801 a 1.000 kg: R$ 21,28;
- 1.001 a 3.000 kg: R$ 31,92;
- 3.001 a 5.000 kg: R$ 42,56;
- acima de 5.000 kg: R$ 53,20.

Se houver excesso total e por eixo, os acréscimos são calculados isoladamente e somados, com uma única multa-base, conforme o art. 57 da Resolução 882. O valor será rotulado “estimativa legal”, com memória de cálculo visível e arredondamento apenas na exibição monetária.

Para CMT, serão usadas as naturezas e valores gerais do CTB: média até 600 kg, grave de 601 a 1.000 kg e gravíssima acima de 1.000 kg, esta aplicada por cada 500 kg ou fração. A memória indicará quando o valor decorre de enquadramento adicional.

## Responsabilidade e providência

O resultado reproduzirá as regras do art. 257 do CTB para indicar embarcador, transportador ou responsabilidade solidária conforme quantidade de remetentes e relação entre peso declarado e aferido. Como esses fatos podem não estar disponíveis, o rótulo será “responsável provável” e virá acompanhado das perguntas que faltam.

Quando houver excesso autuável, será exibida retenção e transbordo da carga excedente. Excesso apenas por eixo poderá exigir remanejamento; as exceções operacionais previstas para produtos perigosos, perecíveis, carga viva e passageiros serão mostradas como alerta para avaliação do agente, nunca como liberação automática.

## RAG e perguntas

O PDF será normalizado por artigo e página. Consultas aceitarão abreviações e linguagem operacional, como “peso carreta”, “nota sem kg”, “5 por cento”, “eixo tandem”, “truck passou peso” e “quem autua embarcador”. A recuperação combina termos normalizados, sinônimos e prioridade por artigo/código.

A resposta da IA deve:

- ser integralmente em português do Brasil;
- citar somente trechos recuperados;
- informar quando a fonte não sustenta a conclusão;
- nunca alterar números calculados pelo motor;
- separar regra, aplicação ao caso e fonte oficial.

## Validação e segurança

Entradas serão validadas em quilogramas e metros, com limites plausíveis e mensagens em português. Campos necessários ausentes produzem resultado inconclusivo, não zero. O sistema não presumirá CMT, tara, limite técnico, AET ou sinalização.

Testes cobrirão funções puras, limites de faixa, arredondamento por 200/500 kg, documento sem tolerância, balança com tolerâncias, regra dos 50 t, códigos simultâneos, responsabilidade, API, acessibilidade do combobox e renderização dos desenhos. Também haverá casos de referência extraídos dos artigos 2º, 6º e 49 a 58 da Resolução 882.

## Critérios de aceite

- o agente seleciona visualmente a configuração e entende seus eixos;
- o resultado nunca trata tolerância como capacidade de carga;
- nota, balança, eixo, CMT, sinalização e AET seguem caminhos explícitos;
- todo código e valor apresenta memória de cálculo e fonte;
- sem dados suficientes, a ferramenta pede exatamente os dados faltantes;
- o cálculo permanece disponível sem IA ou banco;
- a consulta RAG encontra artigos por termos técnicos, abreviações e frases operacionais.
