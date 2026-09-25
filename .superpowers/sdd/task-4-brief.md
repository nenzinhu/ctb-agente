# Task 4: Implement query router, hybrid search, and response generation

**Files:**
- Create: `lib/query/router.ts`, `pii-filter.ts`
- Create: `lib/search/bm25.ts`, `vector.ts`, `reranker.ts`, `hybrid.ts`
- Create: `lib/response/card-builder.ts`, `validator.ts`, `response-types.ts`
- Create: `lib/ratelimit/limiter.ts`, `turnstile.ts`
- Create: `app/api/consulta/route.ts`, `handler.ts`, `types.ts`
- Create: `tests/unit/search.test.ts`, `query-router.test.ts`, `validator.test.ts`

**Interfaces:**
- Consumes: `AIProvider` (from Task 3), Supabase tables, rate limit config
- Produces: `/api/consulta` POST endpoint that accepts `{ consulta: string }` and returns structured response card

## Abbreviated Plan (Full plan in docs/plans)

Due to token constraints, implement all 13 steps from the plan verbatim. Key files:

1. `lib/query/router.ts` — identifyQueryType() and normalizeQuery()
2. `lib/query/pii-filter.ts` — filterPII() masks plate, CPF, CNPJ
3. `lib/search/bm25.ts` — searchByTsvector() with RPC call
4. `lib/search/vector.ts` — searchByVector() with pgvector
5. `lib/search/reranker.ts` — rerank() by score + recency + citability
6. `lib/search/hybrid.ts` — hybridSearch() orchestrates BM25 + pgvector
7. `lib/response/validator.ts` — validateCitations() checks retrieved text
8. `lib/ratelimit/limiter.ts` — checkRateLimit() and recordQuery()
9. `lib/ratelimit/turnstile.ts` — verifyTurnstile() anti-bot
10. `lib/response/card-builder.ts` — buildCard() assembles CartaoEstruturado
11. `lib/response/response-types.ts` — TypeScript types for response card
12. `app/api/consulta/types.ts` — ConsultaRequest schema
13. `app/api/consulta/handler.ts` — handleConsulta() main logic
14. `app/api/consulta/route.ts` — POST /api/consulta endpoint
15. `tests/unit/*.test.ts` — Unit tests for each module

**All code is in the plan document at docs/plans/2026-09-21-ctb-agente-implementation.md, Task 4 section. Copy verbatim and test.**

Key test files:
- `tests/unit/search.test.ts` — rerank() function test
- `tests/unit/query-router.test.ts` — identifyQueryType() tests
- `tests/unit/validator.test.ts` — validateCitations() tests

Commit message:
```
feat: implement query routing, hybrid search, and rate limiting

- Add query router to identify code/article/situation queries
- Create PII filter (mask plate, CPF, CNPJ)
- Implement BM25 search (tsvector) + pgvector search
- Add reranker with recency and citability weights
- Implement hybrid search orchestration
- Create citation validator to check citations exist in retrieved text
- Add rate limiter (30 queries/IP/hour default)
- Implement Turnstile bot protection
- Create /api/consulta POST endpoint
- Add comprehensive unit tests for search and routing

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
```

**Depends on:** Tasks 1-3 complete (dependencies: Supabase client, AIProvider interface, .env.local)
