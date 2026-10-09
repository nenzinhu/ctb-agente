# Document Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make CTB, MBFT, and POP corpus readiness measurable through source metadata, integrity checks, retrieval benchmarks, and an authenticated admin dashboard.

**Architecture:** Extend uploaded-document metadata with a backward-compatible migration, keep bundled-corpus metadata in versioned manifests, and evaluate both through pure quality-domain functions. Persist diagnostic snapshots in Supabase, run heavy checks only through an authenticated admin endpoint, and keep every public search fallback unchanged.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod 4, Supabase/PostgreSQL/pgvector, Jest/Testing Library, Playwright

**Spec:** `docs/superpowers/specs/2026-10-09-qualidade-documental-e-apresentacao-design.md`

## Global Constraints

- Collections are exactly `ctb`, `mbft`, and `pop` in the quality domain.
- New uploads require official source, version, effective date, and review date.
- Old documents remain searchable and are reported as needing review.
- Never invent missing source dates or versions; use `não informado` in the bundled manifest.
- `pronta` requires complete metadata, no critical integrity issue, applicable vector coverage of 100%, Hit@3 of 100%, Hit@1 of at least 90%, and textual latency no greater than 1,500 ms per reference case.
- Missing semantic search is reported explicitly and never blocks textual or bundled local search.
- Heavy diagnosis is authenticated and outside all public-query request paths.
- Every visible message is Brazilian Portuguese and no API response exposes secrets.
- The code remains usable before migration 011: public search works, GET diagnostics reports a pending migration, and mutation endpoints fail with an actionable 503.

## Review Focus

- Existing row with null quality metadata: it remains listed/searchable and receives `atencao`, not a crash — pinned by Tasks 1 and 5.
- Migration 011 absent: admin quality GET returns a pending state while public search remains unchanged — pinned by Task 7.
- Embedding provider absent: textual benchmarks still run and vector status says “indisponível”, not “100%” — pinned by Tasks 5 and 6.
- One benchmark adapter times out or throws: other cases finish and the failed case is recorded — pinned by Task 6.
- Duplicate/invalid uploaded file: no false `pronta` state and the corrective action identifies the document — pinned by Tasks 5 and 8.

---

### Task 1: Quality Schema, Domain Types, and Backward-Compatible Document Reads

**Files:**
- Create: `scripts/migrations-011-document-quality.sql`
- Create: `lib/quality/types.ts`
- Modify: `lib/ingestion/documents.ts`
- Modify: `app/api/admin/documents/route.ts`
- Modify: `tests/integration/admin-api.test.ts`
- Create: `tests/unit/document-quality-schema.test.ts`

**Interfaces:**
- Consumes: existing `DocumentoRegistro`, `listDocuments()`, `isMissingSchemaError()` and migration 008 tables.
- Produces: `ColecaoQualidade`, `EstadoQualidade`, `FonteDocumental`, `MetricasQualidade`, `DiagnosticoBase`; quality fields on `DocumentoRegistro`; `migracaoQualidadePendente` in `DocumentosResposta`.

- [ ] **Step 1: Write the failing migration contract test**

Create `tests/unit/document-quality-schema.test.ts`. Read the SQL file and assert it defines:

- the five document metadata columns from spec section 4.1;
- `diagnosticos_base` with the three collection and three status checks;
- row-level security with no anonymous read policy;
- `document_quality_stats(p_colecao TEXT)`;
- `quality_schema_version()` returning `11`.

- [ ] **Step 2: Extend the admin integration fixture with legacy rows**

Add tests proving `GET /api/admin/documents` returns existing documents with null metadata and `migracaoQualidadePendente: true` when the new RPC/columns are unavailable.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --runInBand tests/unit/document-quality-schema.test.ts tests/integration/admin-api.test.ts`

Expected: FAIL because migration 011 and the response flag do not exist.

- [ ] **Step 4: Define the quality domain types**

In `lib/quality/types.ts`, export:

```ts
export type ColecaoQualidade = 'ctb' | 'mbft' | 'pop';
export type EstadoQualidade = 'pronta' | 'atencao' | 'critica';
export type SituacaoFonte = 'vigente' | 'revisar' | 'substituido';
export interface FonteDocumental {
  fonteOficial: string | null;
  versao: string | null;
  vigenteDesde: string | null;
  conferidoEm: string | null;
  situacao: SituacaoFonte;
}
```

Also define serializable `MetricasQualidade`, `DetalhesQualidade`, and `DiagnosticoBase` with the metric names in spec sections 4–5.

```ts
export interface ResultadoCasoBusca {
  casoId: string;
  posicao: number | null;
  duracaoMs: number;
  passou: boolean;
  erro?: string;
}
export interface MetricasBusca {
  total: number;
  hit1: number;
  hit3: number;
  tempoMedioMs: number;
  piorTempoMs: number;
  casos: ResultadoCasoBusca[];
}
export interface MetricasQualidade {
  documentos: number;
  itens: number;
  trechos: number;
  trechosSemVetor: number;
  coberturaVetorial: number | null;
  invalidos: number;
  duplicados: number;
  busca: MetricasBusca;
}
export interface DetalhesQualidade {
  motivos: string[];
  vetoresAplicaveis: boolean;
  buscaSemanticaDisponivel: boolean;
}
export interface DiagnosticoBase {
  id?: string;
  colecao: ColecaoQualidade;
  status: EstadoQualidade;
  fontes: FonteDocumental[];
  metricas: MetricasQualidade;
  detalhes: DetalhesQualidade;
  executadoEm: string;
}
```

- [ ] **Step 5: Write migration 011**

Add nullable metadata columns to `documentos`, create `diagnosticos_base`, enable RLS, add service-role-safe functions for aggregate document quality and schema version, and add indexes on `(colecao, executado_em DESC)` and document situation/review date. `document_quality_stats` returns `documentos`, `trechos`, `trechos_sem_vetor`, `vazios`, `curtos`, and `duplicados`; it uses `dispositivos` for CTB and `documento_trechos` for POP. It must aggregate in SQL instead of transferring full excerpts.

- [ ] **Step 6: Extend document types and fallback reads**

Add the five database fields to `DocumentoRegistro` and expose camel-case input fields through `NovoDocumento`. When PostgREST reports missing quality columns, retry the legacy field selection, fill quality fields with null/`revisar`, and surface `migracaoQualidadePendente: true` from the admin route.

- [ ] **Step 7: Run focused tests and type checking**

Run: `npm test -- --runInBand tests/unit/document-quality-schema.test.ts tests/integration/admin-api.test.ts`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add scripts/migrations-011-document-quality.sql lib/quality/types.ts lib/ingestion/documents.ts app/api/admin/documents/route.ts tests/unit/document-quality-schema.test.ts tests/integration/admin-api.test.ts
git commit -m "feat: add document quality schema"
```

---

### Task 2: Server-Side Metadata Validation and Persistence

**Files:**
- Create: `lib/quality/metadata.ts`
- Modify: `lib/ingestion/documents.ts`
- Modify: `lib/ingestion/indexar.ts`
- Modify: `app/api/ingestion/upload/route.ts`
- Modify: `app/api/admin/documents/route.ts`
- Modify: `tests/api/ingestion-upload.test.ts`
- Modify: `tests/integration/admin-api.test.ts`
- Create: `tests/unit/quality-metadata.test.ts`

**Interfaces:**
- Consumes: Task 1 `FonteDocumental`, quality fields on `NovoDocumento`, and `DocumentoRegistro`.
- Produces: `DocumentoMetadataSchema`; `updateDocumentMetadata(id, metadata): Promise<DocumentoRegistro>`; `PATCH /api/admin/documents`.

- [ ] **Step 1: Write failing metadata validation tests**

Cover valid ISO dates, impossible dates, blank source/version, review date before effective date, future review date, and `situacao: 'vigente'`. Assert field-specific Portuguese errors.

- [ ] **Step 2: Write failing ingestion API tests**

Assert a new CTB or POP upload without all four fields returns 400, while a complete request passes normalized metadata to `indexarDocumento`. Add a migration-pending case returning 503 with an actionable message.

- [ ] **Step 3: Write failing PATCH route tests**

Assert authentication, invalid body rejection, update of an old document, and 503 when quality columns are absent.

- [ ] **Step 4: Run focused tests and verify failure**

Run: `npm test -- --runInBand tests/unit/quality-metadata.test.ts tests/api/ingestion-upload.test.ts tests/integration/admin-api.test.ts`

Expected: FAIL on missing schema and persistence functions.

- [ ] **Step 5: Implement metadata validation**

Export `DocumentoMetadataSchema` from `lib/quality/metadata.ts` with exact fields `fonteOficial`, `versao`, `vigenteDesde`, `conferidoEm`, and optional `situacao` defaulting to `vigente`. Accept only real `YYYY-MM-DD` calendar dates and reject a future review date.

- [ ] **Step 6: Carry metadata through indexing**

Extend the input types and calls in `app/api/ingestion/upload/route.ts`, `lib/ingestion/indexar.ts`, and `createDocument()` so metadata is stored atomically with the document registry row.

- [ ] **Step 7: Add metadata update persistence**

Implement `updateDocumentMetadata(id, metadata)` in `lib/ingestion/documents.ts` and authenticated `PATCH /api/admin/documents` with `{ id, ...metadata }`. Invalidate the response cache after success.

- [ ] **Step 8: Run focused tests and type checking**

Run the Step 4 test command, then `npm run typecheck`.

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/quality/metadata.ts lib/ingestion/documents.ts lib/ingestion/indexar.ts app/api/ingestion/upload/route.ts app/api/admin/documents/route.ts tests/unit/quality-metadata.test.ts tests/api/ingestion-upload.test.ts tests/integration/admin-api.test.ts
git commit -m "feat: require official document metadata"
```

---

### Task 3: Metadata Fields in Upload and Document Review UI

**Files:**
- Modify: `lib/ingestion/upload-client.ts`
- Modify: `components/AdminUploadForm.tsx`
- Modify: `components/DocumentList.tsx`
- Modify: `tests/components/admin-upload-form.test.tsx`
- Create: `tests/components/document-list-quality.test.tsx`

**Interfaces:**
- Consumes: Task 2 metadata request fields and `PATCH /api/admin/documents`.
- Produces: required upload controls and an inline “Revisar dados” editor for existing documents.

- [ ] **Step 1: Write failing upload-form tests**

Assert labels for `Fonte oficial`, `Versão`, `Vigente desde`, and `Conferido em`; block file submission while any field is blank; and assert `enviarDocumento` receives all four values.

- [ ] **Step 2: Write failing document-list tests**

Assert an old document shows `Revisão necessária`, a current document shows its version/conference date, and saving the inline editor sends authenticated PATCH-compatible JSON to `/api/admin/documents`.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- --runInBand tests/components/admin-upload-form.test.tsx tests/components/document-list-quality.test.tsx`

Expected: FAIL because the controls and review action do not exist.

- [ ] **Step 4: Extend `EnvioOpcoes` and upload JSON**

Make the four metadata values required in `EnvioOpcoes`. Send them to `/api/ingestion/upload` for both CTB and POP collections.

- [ ] **Step 5: Add accessible upload controls**

Add the four required fields to `AdminUploadForm`, keep compact layout usable in the POP sidebar, and preserve entered values across multiple files in one batch.

- [ ] **Step 6: Add document review UI**

Show source/version/status in `DocumentList`. Add an inline editor that uses existing buttons, alerts, and date inputs; reload the list after a successful PATCH.

- [ ] **Step 7: Run focused tests and type checking**

Run the Step 3 command, then `npm run typecheck`.

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/ingestion/upload-client.ts components/AdminUploadForm.tsx components/DocumentList.tsx tests/components/admin-upload-form.test.tsx tests/components/document-list-quality.test.tsx
git commit -m "feat: review source metadata in admin"
```

---

### Task 4: Bundled Source Manifest and Reference Cases

**Files:**
- Create: `data/quality/sources.json`
- Create: `data/quality/search-cases.json`
- Create: `lib/quality/manifest.ts`
- Create: `lib/quality/cases.ts`
- Create: `tests/unit/quality-manifest.test.ts`
- Create: `tests/unit/quality-cases.test.ts`

**Interfaces:**
- Consumes: Task 1 `ColecaoQualidade`, `FonteDocumental`.
- Produces: `carregarFontesLocais(): FonteLocal[]`; `carregarCasosBusca(): CasoBusca[]`; stable case schema.

```ts
export interface FonteLocal extends FonteDocumental {
  colecao: ColecaoQualidade;
  arquivo: string;
}
export interface CasoBusca {
  id: string;
  colecao: ColecaoQualidade;
  consulta: string;
  categoria: 'codigo' | 'artigo' | 'frase' | 'abreviacao' | 'fragmento' | 'erro' | 'sinonimo' | 'giria';
  esperados: string[];
  comparacao: 'exata' | 'prefixo';
  maxPosicao: 1 | 3;
}
```

- [ ] **Step 1: Write failing manifest tests**

Assert there is exactly one manifest record for bundled CTB, MBFT, and POP; unknown source facts remain `não informado`/`revisar`; and duplicate collection IDs are rejected.

- [ ] **Step 2: Write failing reference-case tests**

Define `CasoBusca` with `id`, `colecao`, `consulta`, `categoria`, `esperados`, `comparacao: 'exata' | 'prefixo'`, and `maxPosicao`. Assert unique IDs and at least one code, article, common phrase, abbreviation/fragment, typo/synonym, or slang case across the curated set.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --runInBand tests/unit/quality-manifest.test.ts tests/unit/quality-cases.test.ts`

Expected: FAIL because the files/loaders do not exist.

- [ ] **Step 4: Add truthful bundled-source records**

Create `data/quality/sources.json` for `ctb-lei-9503-compilado.txt`, `mbft-fichas.json`, and `pop-pmsc.json`. Use `não informado` and `revisar` for any version/date not proven by repository evidence.

- [ ] **Step 5: Add the initial curated search cases**

Include, at minimum:

- MBFT: `516-91 → 516-91`, `condutor sem cinto → 518-51`, `moto sem capacete → 703-01`, `segurando celular → 763-31`;
- MBFT operational language: `CNH cassada → 502-91`, `capac → 703-01` by fragment, `bafômetro recusou → 757-90`;
- POP: `POP 002 → 002`, `revista pessoal → 002`, `uso de algema → 003`, `perseguição de veículo → 006`;
- POP typo: `alguema → 003`;
- CTB: `art. 165 → art. 165`, `recusa bafômetro → art. 165-A`, `estacionado na calçada → art. 181` by prefix, `dirigir sem cinto → art. 167`.

- [ ] **Step 6: Implement strict Zod loaders**

Load JSON through server-only modules, validate it once, cache successful results, and throw Portuguese configuration errors with the record ID on invalid input.

- [ ] **Step 7: Run focused tests**

Run the Step 3 command.

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add data/quality lib/quality/manifest.ts lib/quality/cases.ts tests/unit/quality-manifest.test.ts tests/unit/quality-cases.test.ts
git commit -m "feat: add corpus manifests and search benchmarks"
```

---

### Task 5: Integrity Metrics and Readiness Evaluation

**Files:**
- Create: `lib/quality/integrity.ts`
- Create: `lib/quality/readiness.ts`
- Create: `tests/unit/quality-integrity.test.ts`
- Create: `tests/unit/quality-readiness.test.ts`

**Interfaces:**
- Consumes: Task 1 quality types and Task 4 bundled source records.
- Produces: `analisarItensLocais(items): MetricasIntegridade`; `avaliarProntidao(input): { status: EstadoQualidade; motivos: string[] }`.

```ts
export interface MetricasIntegridade {
  itens: number;
  vazios: number;
  curtos: number;
  semEstrutura: number;
  duplicados: number;
  invalidos: number;
}
```

- [ ] **Step 1: Write failing integrity tests**

Use small fixtures to assert detection of empty text, text shorter than `DEFAULT_MIN_CHUNK_CHARS`, duplicate normalized content, duplicate stable IDs, and valid structured items. Include an all-valid fixture.

- [ ] **Step 2: Write failing readiness table tests**

Cover: empty base → `critica`; unreadable/duplicate critical content → `critica`; null metadata → `atencao`; embedding disabled → explicit unavailable reason but no false 100%; vectors pending → `atencao`; Hit@3 below 100%, Hit@1 below 90%, or a case above 1,500 ms → `atencao`; all thresholds met → `pronta`.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --runInBand tests/unit/quality-integrity.test.ts tests/unit/quality-readiness.test.ts`

Expected: FAIL because evaluators do not exist.

- [ ] **Step 4: Implement normalized integrity checks**

Export `analisarItensLocais(items: Array<{ id: string; texto: string; estruturado: boolean }>): MetricasIntegridade`. Reuse `DEFAULT_MIN_CHUNK_CHARS`; normalize whitespace/case for duplicate detection without modifying source text.

- [ ] **Step 5: Implement pure readiness rules**

Export `avaliarProntidao(input: AvaliacaoProntidao): ResultadoProntidao`, where the input contains `fontes`, `documentos`, `itens`, `trechos`, `trechosSemVetor`, `vetoresAplicaveis`, `buscaSemanticaDisponivel`, `invalidos`, `duplicados`, and `busca: MetricasBusca`; the result contains `status` and `motivos`. Keep thresholds as named constants with the exact values from Global Constraints and return Portuguese reasons suitable for the admin UI.

- [ ] **Step 6: Run focused tests**

Run the Step 3 command.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/quality/integrity.ts lib/quality/readiness.ts tests/unit/quality-integrity.test.ts tests/unit/quality-readiness.test.ts
git commit -m "feat: evaluate corpus integrity and readiness"
```

---

### Task 6: Retrieval Benchmark Runner

**Files:**
- Create: `lib/quality/benchmark.ts`
- Create: `lib/quality/search-adapters.ts`
- Create: `tests/unit/quality-benchmark.test.ts`
- Create: `tests/integration/quality-search-adapters.test.ts`

**Interfaces:**
- Consumes: Task 4 `CasoBusca`; existing `buscarFichas`, `buscarPops`, and `hybridSearch`.
- Produces: `executarCasos(casos, buscar, options?): Promise<MetricasBusca>`; `buscarParaDiagnostico(caso): Promise<string[]>`.

- [ ] **Step 1: Write failing runner tests**

Inject a fake search function and clock. Assert exact/prefix matching, null position when absent, Hit@1/Hit@3 percentages, average/worst latency, per-case 1,500 ms timeout, and continuation after one throw/timeout.

- [ ] **Step 2: Write failing adapter tests**

Mock the three existing search functions and assert mapping to stable identifiers: MBFT code, POP number, and CTB `numero_dispositivo`. Assert no AI generation is called.

- [ ] **Step 3: Run focused tests and verify failure**

Run: `npm test -- --runInBand tests/unit/quality-benchmark.test.ts tests/integration/quality-search-adapters.test.ts`

Expected: FAIL because the runner/adapters do not exist.

- [ ] **Step 4: Implement the benchmark runner**

Export `executarCasos(casos: CasoBusca[], buscar: (caso: CasoBusca) => Promise<string[]>, options?: { timeoutMs?: number; now?: () => number }): Promise<MetricasBusca>`. Default timeout is 1,500 ms. Record each failure instead of rejecting the full run.

- [ ] **Step 5: Implement collection adapters**

Route `mbft` to `buscarFichas`, `pop` to `buscarPops`, and `ctb` to `hybridSearch`. Limit each result list to three identifiers and keep PII filtering outside this admin-only curated input path.

- [ ] **Step 6: Run focused tests and type checking**

Run the Step 3 command, then `npm run typecheck`.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add lib/quality/benchmark.ts lib/quality/search-adapters.ts tests/unit/quality-benchmark.test.ts tests/integration/quality-search-adapters.test.ts
git commit -m "feat: benchmark CTB MBFT and POP retrieval"
```

---

### Task 7: Diagnostic Orchestration, Persistence, and Admin API

**Files:**
- Create: `lib/quality/repository.ts`
- Create: `lib/quality/diagnose.ts`
- Create: `app/api/admin/quality/route.ts`
- Create: `tests/api/admin-quality.test.ts`
- Create: `tests/unit/quality-diagnose.test.ts`

**Interfaces:**
- Consumes: Tasks 1, 4, 5, and 6 types/loaders/evaluators; Supabase service client.
- Produces: `executarDiagnostico(colecao): Promise<DiagnosticoBase>`; `listarUltimosDiagnosticos()`; authenticated GET/POST `/api/admin/quality`.

- [ ] **Step 1: Write failing orchestration tests**

Mock repository and benchmark dependencies. Assert separate CTB/MBFT/POP aggregation, vector applicability, status consolidation, persistence, and that one failed check becomes a detail rather than rejecting the whole diagnosis.

- [ ] **Step 2: Write failing API tests**

Cover GET/POST authentication, invalid collection, latest snapshot response, successful execution, migration-absent GET returning 200 with `migracaoPendente: true`, and migration-absent POST returning actionable 503.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --runInBand tests/unit/quality-diagnose.test.ts tests/api/admin-quality.test.ts`

Expected: FAIL because orchestration and route do not exist.

- [ ] **Step 4: Implement the repository**

Add functions to read `document_quality_stats`, detect `quality_schema_version`, save one JSON diagnostic snapshot, and fetch the latest snapshot per collection. Translate missing-schema errors into `MigrationPendingError` without exposing raw SQL messages.

- [ ] **Step 5: Implement diagnostic orchestration**

For local MBFT/POP, validate bundled arrays and manifests. For uploaded CTB/POP documents, consume aggregate RPC data and metadata. Run the collection’s reference cases, call `avaliarProntidao`, and persist the serializable snapshot.

- [ ] **Step 6: Implement the authenticated route**

`GET` returns only stored summaries and migration state. `POST` validates `{ colecao: 'ctb' | 'mbft' | 'pop' }`, exports `maxDuration = 60`, executes one collection, and returns its snapshot.

- [ ] **Step 7: Run focused tests and type checking**

Run the Step 3 command, then `npm run typecheck`.

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add lib/quality/repository.ts lib/quality/diagnose.ts app/api/admin/quality/route.ts tests/unit/quality-diagnose.test.ts tests/api/admin-quality.test.ts
git commit -m "feat: expose authenticated corpus diagnostics"
```

---

### Task 8: Quality Dashboard and Corrective Actions

**Files:**
- Create: `components/admin/AdminQualidadeBases.tsx`
- Modify: `components/admin/AdminRagFineTuning.tsx`
- Create: `tests/components/admin-qualidade-bases.test.tsx`
- Modify: `tests/components/admin-rag-finetuning.test.tsx`

**Interfaces:**
- Consumes: Task 7 GET/POST `/api/admin/quality`; existing `/api/admin/documents/vetores` and admin document sections.
- Produces: three collection cards, readiness status, metrics, migration warning, and contextual corrective actions.

- [ ] **Step 1: Write failing dashboard tests**

Assert loading/error/pending-migration states; one card per collection; `pronta`, `atencao`, and `critica` labels; metadata/vector/Hit@1/Hit@3/latency display; last-run date; and no secret fields rendered.

- [ ] **Step 2: Write failing action tests**

Assert “Executar testes” POSTs one collection and refreshes it; vector action calls the existing endpoint only when applicable; an uploaded document offers “Revisar documento”/“Reenviar documento”; local corpus offers “Validar base local” and never a misleading reindex button.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- --runInBand tests/components/admin-qualidade-bases.test.tsx tests/components/admin-rag-finetuning.test.tsx`

Expected: FAIL because the dashboard does not exist.

- [ ] **Step 4: Implement focused dashboard component**

Fetch stored summaries on mount. Render three accessible cards using existing design-system classes, with compact metric grids and Portuguese corrective reasons. Keep all interaction inside this child rather than expanding `AdminRagFineTuning` further.

- [ ] **Step 5: Integrate beneath the current RAG explanation**

Render `AdminQualidadeBases` inside `AdminRagFineTuning` before the adjustment-training section. Preserve current health warnings and explanatory content.

- [ ] **Step 6: Run focused tests and type checking**

Run the Step 3 command, then `npm run typecheck`.

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add components/admin/AdminQualidadeBases.tsx components/admin/AdminRagFineTuning.tsx tests/components/admin-qualidade-bases.test.tsx tests/components/admin-rag-finetuning.test.tsx
git commit -m "feat: add document quality dashboard"
```

---

### Task 9: Full Verification, Deployment Guidance, and Baseline Run

**Files:**
- Modify: `docs/DEPLOY.md`
- Modify: `tests/e2e/full-flow.test.ts`
- Modify: `scripts/check-health.ts` only if deployment health needs to report migration 011 without treating it as a public outage.

**Interfaces:**
- Consumes: all earlier quality tasks.
- Produces: deploy order, browser-level admin coverage, and final verification evidence.

- [ ] **Step 1: Add the quality migration and baseline procedure to deployment docs**

Document this exact order: deploy compatible code, apply migration 011, fill existing metadata, verify manifests, generate pending vectors, run three diagnostics, correct failures, then rely on the calculated readiness badge.

- [ ] **Step 2: Add seeded admin E2E coverage**

Under the existing authenticated/seeded test guard, assert the quality section renders three collections and one “Executar testes” control per card. Keep tests skipped when credentials or seeded data are absent.

- [ ] **Step 3: Run the complete unit/integration/component suite**

Run: `env -u ADMIN_USERNAME -u ADMIN_PASSWORD_HASH -u ADMIN_SESSION_SECRET npm test -- --runInBand`

Expected: every suite passes.

- [ ] **Step 4: Run static and production checks**

Run: `npm run typecheck`

Run: `NEXT_TELEMETRY_DISABLED=1 npm run build`

Expected: both commands exit 0.

- [ ] **Step 5: Run E2E smoke tests**

Run: `npm run test:e2e`

Expected: public flows pass; seeded/admin-only cases pass when their documented environment flags are set, otherwise skip explicitly.

- [ ] **Step 6: Apply migration 011 only in an authorized target environment**

Resolve the exact Supabase project first, apply `scripts/migrations-011-document-quality.sql`, and verify `quality_schema_version()` returns `11`. Do not expose credentials or apply to an ambiguous project.

- [ ] **Step 7: Run and record the first baseline**

Execute CTB, MBFT, and POP diagnostics from the authenticated panel. Record statuses and reasons; do not manually override a failed readiness badge.

- [ ] **Step 8: Commit**

```bash
git add docs/DEPLOY.md tests/e2e/full-flow.test.ts scripts/check-health.ts
git commit -m "docs: add document quality rollout checks"
```
