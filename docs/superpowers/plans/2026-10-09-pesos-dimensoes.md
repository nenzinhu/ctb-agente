# Pesos e Dimensões Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar uma aba operacional que calcula limites e excesso de peso de caminhões/CVC, informa código, valor estimado, responsável e providência, e responde dúvidas com RAG citado.

**Architecture:** Um catálogo local versionado descreve veículos, eixos e fontes. Funções puras executam todos os cálculos; API e UI apenas validam, orquestram e apresentam. O RAG recupera artigos estruturados localmente e pode pedir à cadeia de IA somente a redação da explicação.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Jest, Testing Library, SVG e cadeia de provedores já existente.

**Spec:** `docs/superpowers/specs/2026-10-09-pesos-dimensoes-design.md`

## Global Constraints

- Toda interface e resposta devem usar português do Brasil.
- A IA nunca decide limites, tolerâncias, códigos ou valores.
- O menor limite entre regra legal, dados técnicos, CMT, sinalização e AET sempre prevalece.
- Tolerância de fiscalização nunca integra a capacidade de carga.
- Campos ausentes geram resultado inconclusivo e lista de dados faltantes.
- Cada conclusão deve carregar fonte, artigo e página.
- Não adicionar dependências de produção.

## Review Focus

- Valores iguais aos limites/tolerâncias devem permanecer não autuáveis; adicionar casos de fronteira nas Tasks 2 e 3.
- Entradas em toneladas, vírgula decimal ou números negativos não podem produzir cálculo silenciosamente incorreto; cobrir na Task 5.
- PBT/PBTC até 50 t não deve gerar código por eixo isolado antes do gatilho legal; cobrir na Task 3.
- AET, sinalização e CMT inferiores ao catálogo devem reduzir o limite; cobrir na Task 2.
- Falha de IA ou ausência de banco não pode ocultar cálculo nem fontes; cobrir nas Tasks 4 e 5.

---

### Task 1: Fonte estruturada e catálogo de configurações

**Files:**
- Create: `data/acervo/resolucao-contran-882-2021.txt`
- Create: `data/pesos-dimensoes/configuracoes.json`
- Create: `lib/pesos-dimensoes/types.ts`
- Create: `lib/pesos-dimensoes/catalogo.ts`
- Test: `tests/unit/pesos-dimensoes-catalogo.test.ts`

**Interfaces:**
- Produces: `ConfiguracaoVeiculo`, `GrupoEixo`, `FontePeso`, `listarConfiguracoes(): ConfiguracaoVeiculo[]`, `obterConfiguracao(id: string): ConfiguracaoVeiculo | null`.

- [ ] **Step 1: Write the failing catalog tests**

Testar IDs únicos, desenho/configuração com o mesmo número de eixos, limites positivos, fontes com artigo/página e presença de rígido 2 eixos, truck, bitruck, semirreboques usuais, bitrem, rodotrem e modo AET.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-catalogo.test.ts`  
Expected: FAIL porque os módulos ainda não existem.

- [ ] **Step 3: Add source and typed catalog**

Converter o PDF anexado preservando `--- Página N ---`. Cada configuração terá `id`, `nome`, `apelidos`, `unidades`, `comprimentoMinimoM`, `comprimentoMaximoM`, `limiteTotalKg`, `requerAet`, `gruposEixo` e `fontes`. Representar limites especiais como requisito de entrada, não como número presumido.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-catalogo.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add weights vehicle catalog and official source"`

### Task 2: Motor de limite regulamentar e capacidade

**Files:**
- Create: `lib/pesos-dimensoes/calculadora.ts`
- Test: `tests/unit/pesos-dimensoes-calculadora.test.ts`

**Interfaces:**
- Consumes: `ConfiguracaoVeiculo` da Task 1.
- Produces: `calcularLimite(entrada: EntradaLimite): ResultadoLimite` e `calcularCapacidadeCarga(limiteKg: number, taraKg: number): number`.
- `EntradaLimite`: configuração, comprimento, PBT/PBTC técnico, CMT, sinalização e AET opcionais.
- `ResultadoLimite`: `status`, `limiteKg`, `fatorDeterminante`, `capacidadeCargaKg`, `faltantes`, `fontes`.

- [ ] **Step 1: Write failing limit tests**

Cobrir menor limite, igualdade, comprimento fora da faixa, AET obrigatória, CMT inferior, sinalização inferior, tara acima do limite, valores ausentes e negativos.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-calculadora.test.ts`  
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implement the pure limit functions**

Não aplicar tolerância. Retornar `inconclusivo` quando um requisito da configuração não for conhecido.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-calculadora.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: calculate regulatory weight limits"`

### Task 3: Fiscalização, códigos, responsabilidade e valores

**Files:**
- Create: `lib/pesos-dimensoes/fiscalizacao.ts`
- Test: `tests/unit/pesos-dimensoes-fiscalizacao.test.ts`

**Interfaces:**
- Consumes: `ResultadoLimite` da Task 2.
- Produces: `avaliarFiscalizacao(entrada: EntradaFiscalizacao): ResultadoFiscalizacao`.
- `EntradaFiscalizacao`: modo `documento` ou `balanca`, tara, carga declarada, total aferido, grupos aferidos, limite por grupo, quantidade de embarcadores e comparação declarado/aferido.
- `ResultadoFiscalizacao`: peso apurado, limites/tolerâncias, excessos, códigos, memória de valores, responsável provável, providências, faltantes e fontes.

- [ ] **Step 1: Write failing document and scale tests**

Cobrir documento sem tolerância; documento sem kg/tara; balança com 5% e 12,5%; regra de 50 t; excesso total, por eixo e simultâneo; CMT nas três faixas; fronteiras exatas; responsabilidade e transbordo/remanejamento.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-fiscalizacao.test.ts`  
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implement deterministic enforcement evaluation**

Usar `Math.ceil(excessoKg / 200)` para art. 231, V; uma base de R$ 130,16 e acréscimos isolados para total/eixos. Para CMT, selecionar 688-20/689-00/690-40 e calcular o valor estatutário em memória separada.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-fiscalizacao.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: evaluate truck weight enforcement"`

### Task 4: Recuperação RAG local e explicação resiliente

**Files:**
- Create: `lib/pesos-dimensoes/fontes.ts`
- Create: `lib/pesos-dimensoes/rag.ts`
- Test: `tests/unit/pesos-dimensoes-rag.test.ts`

**Interfaces:**
- Produces: `buscarTrechosPesos(consulta: string, limite?: number): TrechoPeso[]`, `montarContextoPesos(trechos: TrechoPeso[]): string` e `explicarPesos(consulta: string): Promise<RespostaPeso>`.

- [ ] **Step 1: Write failing retrieval tests**

As consultas `nota sem kg`, `peso carreta`, `5 por cento`, `eixo tandem`, `quem responde embarcador` e `CMT acima de mil` devem recuperar artigos/códigos corretos com página.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-rag.test.ts`  
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implement article parsing, normalized ranking and fallback**

Reusar `normalizarBusca` e a cadeia de provedores. O fallback retorna trechos oficiais em português quando a IA falhar.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/unit/pesos-dimensoes-rag.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: retrieve cited weight regulations"`

### Task 5: APIs validadas

**Files:**
- Create: `app/api/pesos-dimensoes/consultar/route.ts`
- Create: `app/api/pesos-dimensoes/perguntar/route.ts`
- Test: `tests/api/pesos-dimensoes.test.ts`

**Interfaces:**
- Consumes: Tasks 1 a 4.
- Produces: POST JSON em `/consultar` e `/perguntar`, sempre com mensagens em português.

- [ ] **Step 1: Write failing API tests**

Cobrir entrada válida nos dois modos, vírgula decimal rejeitada com orientação, negativos, configuração inexistente, campos faltantes, erro de IA e preservação de fontes.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/api/pesos-dimensoes.test.ts`  
Expected: FAIL porque as rotas não existem.

- [ ] **Step 3: Implement Zod schemas and route handlers**

Aceitar apenas quilogramas como números JSON; a UI converte entradas localizadas antes do envio. Limitar consulta livre a 500 caracteres e não registrar dados pessoais.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/api/pesos-dimensoes.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: expose weights calculation APIs"`

### Task 6: Seletor visual e desenho de caminhões

**Files:**
- Create: `components/pesos-dimensoes/DesenhoVeiculo.tsx`
- Create: `components/pesos-dimensoes/SeletorConfiguracao.tsx`
- Test: `tests/components/seletor-configuracao.test.tsx`

**Interfaces:**
- Produces: `DesenhoVeiculo({ configuracao, compacto })` e `SeletorConfiguracao({ valor, onChange })`.

- [ ] **Step 1: Write failing accessibility and rendering tests**

Testar teclado, foco, `aria-expanded`, opção selecionada, linhas com nome/eixos e SVG coerente com unidades/grupos.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/components/seletor-configuracao.test.tsx`  
Expected: FAIL por componentes ausentes.

- [ ] **Step 3: Implement accessible visual combobox and SVG**

Usar botões/listbox em linhas visíveis, sem depender de imagem externa ou `select` nativo incapaz de mostrar miniaturas.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/components/seletor-configuracao.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add visual truck configuration selector"`

### Task 7: Página operacional, resultados e navegação

**Files:**
- Create: `components/pesos-dimensoes/CalculadoraPesos.tsx`
- Create: `components/pesos-dimensoes/ResultadoPesos.tsx`
- Create: `components/pesos-dimensoes/PerguntasPesos.tsx`
- Create: `app/pesos-dimensoes/page.tsx`
- Modify: `components/Header.tsx`
- Modify: `components/mobile/MobileNavigation.tsx`
- Modify: `components/ui/Icone.tsx`
- Test: `tests/components/pesos-dimensoes-page.test.tsx`

**Interfaces:**
- Consumes: catálogo da Task 1 e APIs da Task 5.

- [ ] **Step 1: Write failing interaction tests**

Testar troca de modo, campos condicionais, conversão segura de kg, resultado completo, memória de cálculo, códigos/valores, estado inconclusivo, fontes e navegação desktop/mobile.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand tests/components/pesos-dimensoes-page.test.tsx`  
Expected: FAIL por página/componentes ausentes.

- [ ] **Step 3: Implement the guided page and result cards**

Manter ações com alvos de toque de 44 px, resumo fixo da configuração e avisos que diferenciem limite, tolerância e excesso autuável.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand tests/components/pesos-dimensoes-page.test.tsx`  
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add operational weights and dimensions page"`

### Task 8: Verificação integrada e documentação operacional

**Files:**
- Modify: `README.md`
- Modify: `docs/DEPLOY.md`
- Create: `tests/integration/pesos-dimensoes.test.ts`

**Interfaces:**
- Consumes: todo o recurso concluído.

- [ ] **Step 1: Write reference-case integration tests**

Cobrir ao menos um documento fiscal, uma balança sem excesso, 683-11, 683-12, 683-13, cada faixa de CMT e AET inconclusiva sem dados.

- [ ] **Step 2: Run integration test to verify current gaps**

Run: `npm test -- --runInBand tests/integration/pesos-dimensoes.test.ts`  
Expected: FAIL até todos os contratos estarem ligados.

- [ ] **Step 3: Connect remaining contracts and document sources/limitations**

Registrar a versão da Resolução, funcionamento offline determinístico e como substituir a fonte oficial.

- [ ] **Step 4: Run full verification**

Run: `npm run typecheck && npm test -- --runInBand && npm run build`  
Expected: TypeScript sem erros, toda a suíte verde e build com `/pesos-dimensoes` e as duas APIs.

- [ ] **Step 5: Commit**

`git commit -m "test: verify weights and dimensions workflow"`
