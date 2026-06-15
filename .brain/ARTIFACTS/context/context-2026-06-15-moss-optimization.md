# Context: MOSS Index Optimization & Diagnostic Quality

## Snapshot
- Prior brainstorming identified the Developer plan's 3-index limit as the primary constraint
- Current code creates one MOSS index per product — hits the limit at product #3
- Broader doc deep-dive revealed 11 gaps spanning index usage, chunking quality, search tuning, performance, and production polish
- All gaps directly affect diagnostic assistant quality (context relevance, latency, freshness)

## Key Findings
1. **3-index cap** on Developer plan — each product burns one index
2. **Chunking is naive** — one chunk per PDF page, no token awareness, no overlap, no boilerplate stripping
3. **Pure vector search** — no keyword blending for exact part numbers, SKUs, error codes
4. **Sequential queries** — cloud + session queries run serially, doubling latency
5. **Index reloaded per query** — no caching, no auto-refresh, no disk persistence
6. **Session memory is flat** — only raw messages, no structured context
7. **All error types swallowed** — can't distinguish expected from critical
8. **Dead code** — superseded test files still in tree
9. **`any` types** — no MOSS SDK types used for query results

## Decisions Made
1. Consolidate all product indexes into a single shared `"manuals"` index with `{ productId }` metadata filtering
2. Replace delete+recreate with `addDocs` upsert for index updates
3. Use metadata filtering for product-scoped queries instead of per-index queries
4. Default to `moss-mediumlm` model for better accuracy on technical content
5. Default hybrid search to `alpha: 0.5` for keyword+semantic blend
6. Chunk PDFs by ~300 tokens with ~50 token overlap, stripping boilerplate
7. Parallelize cloud + session queries with `Promise.all`
8. Load the shared index once with `cachePath` + `autoRefresh`
9. Use MOSS SDK types (`QueryResultDocumentInfo`, `SearchResult`, etc.)
10. Add typed error handling for MOSS operations
11. Remove dead code (`debug/moss.ts`, `test_moss.ts`, `moss-test.ts`)

## Filtered Out (Future Iteration)
- Voice agent (LiveKit) integration
- MCP server exposure
- Frontend WASM SDK
- Cross-agent context handoff
- Data connectors (Supabase sync)
- Custom embeddings / fine-tuned models
- Observability dashboards

## Integration Points
- `backend/src/moss/client.ts` — core refactoring target
- `backend/src/routes/product.ts` — upload, diagnose, ask endpoints
- `backend/src/routes/moss-test.ts` — dead code to remove
- `backend/src/debug/moss.ts` — dead code to remove
- `backend/test_moss.ts` — dead code to remove
- `backend/src/config/env.ts` — MOSS model config (optional)

## Verification
1. Backend compiles without errors (`bun run --bun src/index.ts`)
2. Upload flow works with shared index
3. Query flow returns product-scoped results via metadata filter
4. Session queries still work for conversation history
5. Dead code removal doesn't break route registration

## Notes for Next Agent
- The plan now includes a Refined Plan section, Pass 2 Refinements, and Pass 3 Refinements (all appended). Original content is intact.
- Task 2's "same function signatures" has been corrected: call-site signatures change slightly (loadIndex → ensureIndexReady, query adds filter param).
- Tasks 3-5 must handle MOSS errors gracefully (degraded 200 with empty results, not 500).
- The index must be created on first use via `ensureIndexReady()` — the first deploy may have no `"manuals"` index yet.
- Tasks 2 and 3-5 must be edited atomically (broken compile state between them).
- Old per-product indexes in MOSS cloud are orphaned — cleanup is optional but recommended.
- Chunk size (300 tokens) is a configurable constant, not hardcoded.
- Verify `pdf-parse` (or equivalent) is available in the upload handler before the chunker runs.
- Baseline latency measurements for diagnose/ask endpoints must be taken before any code changes (added in Pass 2).
- Chunk document ID scheme must be `${productId}-${page}-${chunkIndex}` for upsert reliability (added in Pass 2).
- A mock MOSS client is required for testability — the refactored client must accept optional mock injection (added in Pass 2).
- Chunker unit tests and endpoint integration tests must be created alongside implementation, not after (added in Pass 2).
- **Pass 3 critical edge cases**: `ensureIndexReady()` must use promise caching to prevent race conditions. Use `Promise.allSettled` not `Promise.all` in Ask endpoint. PDF parsing failure must not roll back Supabase storage save. All endpoints must reject empty/whitespace query strings with 400. Dead code deletion must handle already-missing files. Verification must confirm server stays alive for 3+ seconds, not just compiles.
- **Excluded from this execution** (future iterations): Metadata filter performance analysis, chunk size A/B testing, observability dashboards, old index migration, addDocs transaction support, index sharding.
