# Condutores e Veículos Estrangeiros Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar a aba “Condutores e Veículos Estrangeiros” com fiscalização guiada, consulta livre tolerante a erros, decisões determinísticas fundamentadas no CTB/MBFT e explicações RAG provenientes somente de fontes oficiais revisadas.

**Architecture:** Um catálogo JSON versionado descreve fontes, grupos de países, acordos e regras operacionais; funções puras interpretam fatos e produzem perguntas ou resultados, sem IA. A API combina esse resultado com trechos da coleção Supabase `estrangeiros`, mas o RAG apenas explica e cita: nunca promove regra pendente, cria acordo ou escolhe infração. A página Next.js permanece funcional sem banco ou provedor de IA.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.6, Zod 4, Supabase PostgreSQL/pgvector, Jest e Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-11-condutores-veiculos-estrangeiros-design.md`

## Global Constraints

- Nome completo: **Condutores e Veículos Estrangeiros**; rótulo curto: **Estrangeiros**; rota: `/estrangeiros`.
- Migração idempotente deve preservar `ctb`, `pop` e `natureza_potencial`, inclusive no banco em que o usuário já aplicou o SQL manual.
- Códigos MBFT, artigos, datas e identificadores de acordos usam correspondência exata; fuzzy matching é restrito a texto descritivo.
- Uma conclusão `confirmada` exige regra versionada, fonte oficial vigente e revisão humana; caso contrário retorna `requer_conferencia`.
- O catálogo inicial reutiliza apenas o CTB e as fichas MBFT locais conferíveis. Países, acordos ou reciprocidades sem instrumento oficial cadastrado não são presumidos.
- IA e RAG explicam resultados determinísticos; não criam prazo, equivalência, acordo, infração ou providência.
- Não solicitar nem armazenar nome, placa, CPF, passaporte ou número de habilitação.
- Interface em português do Brasil, responsiva, acessível por teclado e útil offline.
- Nenhuma dependência de produção nova.

## Review Focus

- País digitado com abreviação, acento ou erro deve ser reconhecido sem transformar país desconhecido em participante de acordo; Task 2 fixa esse caso.
- Data de entrada ausente ou inválida deve produzir pergunta de esclarecimento, nunca prazo presumido; Tasks 2 e 3 fixam esse caso.
- Documento estrangeiro vencido e categoria incompatível podem gerar alternativas condicionais visíveis, nunca autuação automática; Tasks 3 e 5 fixam esse caso.
- Supabase, vetores ou IA indisponíveis devem manter a avaliação determinística e informar apenas a perda da explicação ampliada; Task 4 fixa esse caso.
- Código MBFT/artigo inexistente ou adulterado deve ser rejeitado exatamente, sem correção aproximada; Tasks 2 e 3 fixam esse caso.

---

### Task 1: Coleção documental `estrangeiros`

**Files:**
- Create: `scripts/migrations-013-estrangeiros.sql`
- Modify: `lib/ingestion/documents.ts`
- Modify: `app/api/ingestion/upload/route.ts`
- Modify: `lib/search/trechos.ts`
- Modify: `lib/search/reranker.ts`
- Modify: `lib/quality/types.ts`
- Modify: `lib/quality/manifest.ts`
- Modify: `app/api/admin/quality/route.ts`
- Modify: `README.md`
- Test: `tests/unit/estrangeiros-migration.test.ts`
- Test: `tests/api/ingestion-upload.test.ts`
- Test: `tests/unit/document-quality-schema.test.ts`
- Test: `tests/unit/quality-readiness.test.ts`

**Interfaces:**
- Consumes: tabelas `documentos`, `documento_trechos`, `diagnosticos_base` e RPCs das migrations 008–012.
- Produces: `Colecao` com `'estrangeiros'`, `ColecaoRanking` com `'estrangeiros'` e coleção auditável/indexável pelo pipeline existente.

- [ ] **Step 1: Escrever testes que leem a migration e exigem as quatro coleções, função de qualidade para coleções não CTB e execução idempotente.**

```ts
expect(sql).toContain("'estrangeiros'");
expect(sql).toMatch(/where p_colecao <> 'ctb'/i);
expect(sql).toMatch(/drop constraint if exists/i);
```

- [ ] **Step 2: Executar os testes de schema e confirmar falha porque a migration 013 e o tipo ainda não existem.**

Run: `npm test -- --runInBand tests/unit/estrangeiros-migration.test.ts tests/unit/document-quality-schema.test.ts`

- [ ] **Step 3: Criar a migration idempotente e ampliar os unions/Zod/RAG para `estrangeiros`.**

`Colecao` deve virar `'ctb' | 'pop' | 'natureza_potencial' | 'estrangeiros'`; a rota de upload deve exigir `DocumentoMetadataSchema` para a nova coleção. A migration eleva `quality_schema_version()` para `13`, e o teste de prontidão passa a aceitar/exigir essa versão.

- [ ] **Step 4: Acrescentar caso de upload autenticado para `colecao: 'estrangeiros'`, preservando `situacao: 'revisar'` como padrão.**

- [ ] **Step 5: Executar testes de ingestão, qualidade e busca.**

Run: `npm test -- --runInBand tests/unit/estrangeiros-migration.test.ts tests/api/ingestion-upload.test.ts tests/unit/document-quality-schema.test.ts tests/unit/quality-readiness.test.ts tests/unit/search.test.ts`
Expected: PASS.

- [ ] **Step 6: Documentar a migration 013 depois da 012 e commitar.**

```bash
git add scripts/migrations-013-estrangeiros.sql lib/ingestion/documents.ts app/api/ingestion/upload/route.ts lib/search/trechos.ts lib/search/reranker.ts lib/quality/types.ts lib/quality/manifest.ts app/api/admin/quality/route.ts README.md tests
git commit -m "feat: habilita acervo RAG de estrangeiros"
```

### Task 2: Contratos, catálogo e interpretação da consulta

**Files:**
- Create: `lib/estrangeiros/types.ts`
- Create: `lib/estrangeiros/catalogo.ts`
- Create: `lib/estrangeiros/consulta.ts`
- Create: `data/estrangeiros/catalogo.json`
- Test: `tests/unit/estrangeiros-catalogo.test.ts`
- Test: `tests/unit/estrangeiros-consulta.test.ts`

**Interfaces:**
- Consumes: `data/acervo/ctb-lei-9503-compilado.txt`, `data/acervo/mbft-fichas.json`, normalização lexical existente e fontes estrangeiras posteriormente revisadas.
- Produces: `carregarCatalogoEstrangeiros(): CatalogoEstrangeiros`, `validarCatalogoEstrangeiros(valor: unknown): CatalogoEstrangeiros` e `interpretarConsultaEstrangeiros(texto: string, catalogo?: CatalogoEstrangeiros): Partial<FatosEstrangeiros>`.

- [ ] **Step 1: Escrever testes do schema do catálogo.**

Os testes exigem IDs únicos, ISO alfa-2 para países, referência exata a fichas MBFT existentes, fonte existente para toda regra e proibição de regra `confirmada` ligada a fonte `revisar` ou `substituida`.

- [ ] **Step 2: Executar os testes e confirmar falha pela ausência dos módulos.**

Run: `npm test -- --runInBand tests/unit/estrangeiros-catalogo.test.ts tests/unit/estrangeiros-consulta.test.ts`

- [ ] **Step 3: Definir os tipos centrais.**

```ts
export type EstadoRevisao = 'confirmada' | 'revisar' | 'substituida';
export type EstadoResultado = 'confirmada' | 'requer_conferencia' | 'nao_aplicavel';
export interface FatosEstrangeiros {
  paisHabilitacao?: string;
  paisPlaca?: string;
  visitanteOuResidente?: 'visitante' | 'residente';
  dataEntrada?: string;
  habilitacao?: 'valida' | 'vencida' | 'nao_apresentada';
  pidApresentada?: boolean;
  identidadeApresentada?: boolean;
  categoriaCompativel?: boolean;
  registroVeiculo?: 'brasileiro' | 'estrangeiro';
  finalidade?: 'particular' | 'carga' | 'passageiros';
  seguroApresentado?: boolean;
  admissaoTemporariaApresentada?: boolean;
}
```

- [ ] **Step 4: Criar catálogo conservador e validado.**

O catálogo inicial referencia as regras estrangeiras explicitamente presentes na ficha MBFT `501-00` e os dispositivos existentes do CTB; listas de países/acordos ficam `revisar` até possuírem instrumento oficial, URL, vigência e `conferidoEm`. Não copiar uma lista de países de blogs ou de memória. `carregarCatalogoEstrangeiros()` valida e memoriza uma única instância por processo.

- [ ] **Step 5: Implementar interpretação tolerante a abreviações, erros e meias-palavras somente nos campos textuais.**

Casos obrigatórios: `arg`, `urug`, `carteira estrang venc`, `pid sem carteira`, `carro paraguaio sem seguro`; `501-01` não pode virar `501-00`.

- [ ] **Step 6: Executar testes e commitar.**

Run: `npm test -- --runInBand tests/unit/estrangeiros-catalogo.test.ts tests/unit/estrangeiros-consulta.test.ts`
Expected: PASS.

```bash
git add lib/estrangeiros data/estrangeiros tests/unit/estrangeiros-*.test.ts
git commit -m "feat: cria catálogo de fiscalização estrangeira"
```

### Task 3: Motor determinístico de fiscalização

**Files:**
- Create: `lib/estrangeiros/motor.ts`
- Test: `tests/unit/estrangeiros-motor.test.ts`

**Interfaces:**
- Consumes: `FatosEstrangeiros` e `CatalogoEstrangeiros` da Task 2.
- Produces: `avaliarEstrangeiro(fatos: FatosEstrangeiros, catalogo?: CatalogoEstrangeiros): ResultadoEstrangeiros`.

- [ ] **Step 1: Escrever tabela de casos para perguntas pendentes, regras satisfeitas, descartadas e conflitantes.**

```ts
expect(avaliarEstrangeiro({ paisHabilitacao: 'AR' }).perguntasPendentes)
  .toContain('dataEntrada');
expect(resultadoSemFonte.estado).toBe('requer_conferencia');
expect(resultadoSemFonte.infracoes.every((item) => item.condicional)).toBe(true);
```

Inclua visitante/residente, habilitação válida/vencida/ausente, PID desacompanhada, identidade ausente, categoria incompatível, mais/menos de 180 dias, veículo brasileiro/estrangeiro e país sem acordo confirmado.

- [ ] **Step 2: Executar o teste e confirmar falha pela ausência do motor.**

Run: `npm test -- --runInBand tests/unit/estrangeiros-motor.test.ts`

- [ ] **Step 3: Implementar funções puras, sem banco, relógio implícito ou IA.**

Datas usam uma data de referência recebida no catálogo/regra; enquadramentos carregam código, artigo, condições, medida, fonte e `condicional`. Regra ou fonte não confirmada força `requer_conferencia`.

- [ ] **Step 4: Acrescentar testes que rejeitam código/artigo inexistente e preservam alternativas distintas.**

- [ ] **Step 5: Executar testes e commitar.**

Run: `npm test -- --runInBand tests/unit/estrangeiros-motor.test.ts tests/unit/estrangeiros-catalogo.test.ts`
Expected: PASS.

```bash
git add lib/estrangeiros/motor.ts tests/unit/estrangeiros-motor.test.ts
git commit -m "feat: adiciona motor de fiscalização estrangeira"
```

### Task 4: RAG citado e API de consulta

**Files:**
- Create: `lib/rag/estrangeiros.ts`
- Create: `app/api/estrangeiros/consultar/handler.ts`
- Create: `app/api/estrangeiros/consultar/route.ts`
- Test: `tests/unit/rag-estrangeiros.test.ts`
- Test: `tests/api/estrangeiros.test.ts`

**Interfaces:**
- Consumes: `interpretarConsultaEstrangeiros`, `avaliarEstrangeiro`, `buscarTrechos(consulta, 'estrangeiros')`, filtro PII, rate limit e cadeia de provedores.
- Produces: `POST /api/estrangeiros/consultar` com `{ pergunta?: string; fatos?: FatosEstrangeiros }` e resposta `ResultadoEstrangeiros & { explicacao?: string; trechos: TrechoEncontrado[]; aviso?: string }`.

- [ ] **Step 1: Escrever testes do prompt e da rota antes da implementação.**

Exigir português do Brasil, citações numeradas, proibição explícita de inventar acordo/país/prazo/código e rejeição de data inválida ou texto acima de 500 caracteres.

- [ ] **Step 2: Executar testes e confirmar falha pela ausência da rota.**

Run: `npm test -- --runInBand tests/unit/rag-estrangeiros.test.ts tests/api/estrangeiros.test.ts`

- [ ] **Step 3: Implementar RAG que recebe o resultado pronto e solicita apenas explicação das fontes recuperadas.**

Trecho com documento `revisar` pode ser mostrado com aviso, mas não muda `estado`, `acordos` ou `infracoes` do motor.

Um teste deve simular trecho RAG contrário ao catálogo e exigir `conflitoDocumental: true`, preservando integralmente a conclusão determinística.

- [ ] **Step 4: Implementar handler/rota com resposta parcial para perguntas pendentes.**

Supabase ou IA indisponível retorna o resultado determinístico com `trechos: []` e aviso; não retorna HTTP 500 por essa indisponibilidade.

- [ ] **Step 5: Executar testes e commitar.**

Run: `npm test -- --runInBand tests/unit/rag-estrangeiros.test.ts tests/api/estrangeiros.test.ts tests/unit/pii-filter.test.ts`
Expected: PASS.

```bash
git add lib/rag/estrangeiros.ts app/api/estrangeiros tests/unit/rag-estrangeiros.test.ts tests/api/estrangeiros.test.ts
git commit -m "feat: expõe consulta fundamentada de estrangeiros"
```

### Task 5: Assistente guiado e resultados operacionais

**Files:**
- Create: `app/estrangeiros/page.tsx`
- Create: `components/estrangeiros/EstrangeirosConsulta.tsx`
- Create: `components/estrangeiros/FormularioEstrangeiros.tsx`
- Create: `components/estrangeiros/ResultadoEstrangeiros.tsx`
- Create: `lib/estrangeiros/fallback-cliente.ts`
- Test: `tests/components/estrangeiros-consulta.test.tsx`
- Test: `tests/components/estrangeiros-resultado.test.tsx`

**Interfaces:**
- Consumes: contrato da API da Task 4 e tipos da Task 2.
- Produces: fluxo guiado e busca livre na rota `/estrangeiros`, com fallback determinístico no navegador.

- [ ] **Step 1: Escrever testes de interface para campos condicionais e envio parcial.**

Testar teclado/mobile, ausência de campos pessoais, país/habilitação/veículo/finalidade, e pergunta de esclarecimento antes de conclusão.

- [ ] **Step 2: Escrever testes de resultado.**

Exigir blocos “Situação analisada”, “Documentos e condições”, “Base internacional”, “Possíveis enquadramentos”, “Medidas e providências” e “Fontes”; alternativas devem ser linhas/botões visíveis, nunca `<select>`.

- [ ] **Step 3: Executar testes e confirmar falha pela ausência dos componentes.**

Run: `npm test -- --runInBand tests/components/estrangeiros-consulta.test.tsx tests/components/estrangeiros-resultado.test.tsx`

- [ ] **Step 4: Implementar componentes usando os tokens e componentes UI existentes.**

O formulário usa a API como caminho principal. Se a requisição falhar por ausência de rede, `avaliarEstrangeiroNoCliente(fatos, pergunta?)` interpreta e executa o mesmo motor puro com o catálogo empacotado, retornando aviso de que RAG e conferência documental ampliada estão indisponíveis. Estado `requer_conferencia` recebe aviso destacado e nunca texto “autue”.

- [ ] **Step 5: Executar testes, typecheck e commitar.**

Run: `npm test -- --runInBand tests/components/estrangeiros-consulta.test.tsx tests/components/estrangeiros-resultado.test.tsx && npm run typecheck`
Expected: PASS.

```bash
git add app/estrangeiros components/estrangeiros lib/estrangeiros/fallback-cliente.ts tests/components/estrangeiros-*.test.tsx
git commit -m "feat: cria assistente de fiscalização estrangeira"
```

### Task 6: Navegação, mobile e operação offline

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/mobile/MobileNavigation.tsx`
- Modify: `lib/pwa/cache-policy.ts`
- Test: `tests/components/header-mobile.test.tsx`
- Test: `tests/components/mobile-navigation.test.tsx`
- Test: `tests/unit/pwa-cache-policy.test.ts`
- Test: `tests/components/estrangeiros-offline.test.tsx`

**Interfaces:**
- Consumes: rota e componentes da Task 5.
- Produces: acesso “Estrangeiros” no desktop e em “Ferramentas” no mobile; shell e catálogo local disponíveis offline.

- [ ] **Step 1: Escrever testes que procuram `/estrangeiros` nos dois menus e validam fallback offline determinístico.**

- [ ] **Step 2: Executar testes e confirmar falha porque a rota ainda não está nos menus/cache.**

Run: `npm test -- --runInBand tests/components/header-mobile.test.tsx tests/components/mobile-navigation.test.tsx tests/unit/pwa-cache-policy.test.ts tests/components/estrangeiros-offline.test.tsx`

- [ ] **Step 3: Adicionar navegação compacta e política de cache apenas para shell/catálogo.**

Não armazenar indiscriminadamente PDFs, respostas com fatos informados ou chamadas da API.

- [ ] **Step 4: Executar testes responsivos e commitar.**

Run: `npm test -- --runInBand tests/components/header-mobile.test.tsx tests/components/mobile-navigation.test.tsx tests/unit/pwa-cache-policy.test.ts tests/unit/responsive-tabs-css.test.ts tests/components/estrangeiros-offline.test.tsx`
Expected: PASS.

```bash
git add components/Header.tsx components/mobile/MobileNavigation.tsx lib/pwa/cache-policy.ts tests
git commit -m "feat: integra estrangeiros à navegação offline"
```

### Task 7: Administração e revisão humana

**Files:**
- Modify: `app/admin/page.tsx`
- Modify: `components/AdminUploadForm.tsx`
- Modify: `components/DocumentList.tsx`
- Modify: `components/admin/AdminCorpusAudit.tsx`
- Create: `components/admin/AdminEstrangeirosCatalogo.tsx`
- Create: `app/api/admin/estrangeiros/route.ts`
- Modify: `app/api/admin/documents/route.ts`
- Test: `tests/components/admin-upload-form.test.tsx`
- Test: `tests/components/document-list-quality.test.tsx`
- Test: `tests/components/admin-corpus-audit.test.tsx`
- Test: `tests/api/admin-quality.test.ts`
- Test: `tests/api/admin-estrangeiros.test.ts`

**Interfaces:**
- Consumes: coleção e auditoria da Task 1.
- Produces: seção administrativa “Estrangeiros” para upload, listagem, geração de vetores, auditoria, promoção documental humana e inventário somente leitura das regras/acordos versionados.

- [ ] **Step 1: Escrever testes exigindo metadados oficiais e `situacao: revisar` na ingestão.**

- [ ] **Step 2: Escrever teste que impede promover documento sem fonte, versão, vigência e data de conferência.**

- [ ] **Step 3: Escrever teste da API administrativa que exige sessão e devolve regras, acordos, fontes e estados sem permitir mutação do catálogo Git.**

- [ ] **Step 4: Executar testes e confirmar falha porque o painel ainda enumera apenas as coleções atuais.**

Run: `npm test -- --runInBand tests/components/admin-upload-form.test.tsx tests/components/document-list-quality.test.tsx tests/components/admin-corpus-audit.test.tsx tests/api/admin-quality.test.ts tests/api/admin-estrangeiros.test.ts`

- [ ] **Step 5: Integrar a coleção e o inventário do catálogo ao painel sem permitir que promoção documental altere automaticamente regras do catálogo Git.**

- [ ] **Step 6: Executar testes e commitar.**

Run: `npm test -- --runInBand tests/components/admin-upload-form.test.tsx tests/components/document-list-quality.test.tsx tests/components/admin-corpus-audit.test.tsx tests/api/admin-quality.test.ts tests/api/admin-estrangeiros.test.ts`
Expected: PASS.

```bash
git add app/admin components/AdminUploadForm.tsx components/DocumentList.tsx components/admin/AdminCorpusAudit.tsx components/admin/AdminEstrangeirosCatalogo.tsx app/api/admin/documents/route.ts app/api/admin/estrangeiros/route.ts tests
git commit -m "feat: adiciona revisão do acervo estrangeiro"
```

### Task 8: Aceite integrado, documentação e preparação para publicação

**Files:**
- Modify: `README.md`
- Modify: `docs/BUSCA-E-AVALIACAO.md`
- Create: `tests/integration/estrangeiros.test.ts`
- Create: `tests/e2e/estrangeiros.spec.ts`

**Interfaces:**
- Consumes: todas as Tasks 1–7.
- Produces: evidência de aceite e instruções de operação/revisão da nova base.

- [ ] **Step 1: Escrever integração cobrindo consulta completa, consulta incompleta, país sem regra confirmada, fallback sem IA/banco e código MBFT exato.**

- [ ] **Step 2: Escrever E2E para desktop e viewport mobile, sem depender de corpus Supabase populado.**

- [ ] **Step 3: Documentar migration 013, upload, revisão, limitações jurídicas e política de fontes.**

- [ ] **Step 4: Executar a verificação completa.**

Run: `npm run typecheck && npm test -- --runInBand && npm run build`
Expected: typecheck sem erros, todas as suítes Jest aprovadas e build com `/estrangeiros` e `/api/estrangeiros/consultar`.

- [ ] **Step 5: Executar E2E quando os navegadores Playwright estiverem disponíveis.**

Run: `npm run test:e2e -- tests/e2e/estrangeiros.spec.ts`
Expected: PASS; se a infraestrutura não tiver navegador, registrar como não executado, sem confundir com aprovação.

- [ ] **Step 6: Revisar `git diff`, confirmar que `AGENTS.md` continua fora e commitar.**

```bash
git add README.md docs/BUSCA-E-AVALIACAO.md tests/integration/estrangeiros.test.ts tests/e2e/estrangeiros.spec.ts
git commit -m "test: valida fiscalização de estrangeiros"
```

- [ ] **Step 7: Antes de push/deploy, confirmar com o usuário o destino e verificar a ponta remota sem force push.**
