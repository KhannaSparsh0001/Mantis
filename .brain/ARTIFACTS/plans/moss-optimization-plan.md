# MOSS Index Optimization & Diagnostic Quality Plan

**Goal:** Consolidate per-product MOSS indexes into a single shared index with metadata filtering, fix chunking quality, tune search parameters, parallelize queries, add production-grade persistence and error handling.

**Architecture:**
- A single shared MOSS index `"manuals"` replaces N per-product indexes
- All documents carry `{ productId }` metadata for product-scoped queries
- Query with `filter: { field: 'productId', condition: { $eq } }` for product isolation
- PDFs chunked by ~300 tokens with ~50 token overlap before indexing
- Hybrid search with `alpha: 0.5` blends keyword + semantic scoring
- `moss-mediumlm` model for higher accuracy on technical content
- Shared index loaded once via `loadIndex('manuals', { cachePath, autoRefresh })`
- Cloud index + session queries run in parallel via `Promise.all`
- Sessions store richer context (conclusions, checked parts, metadata)
- Typed MOSS SDK interfaces replace `any` casts
- Differentiated error handling per MOSS error type

**Files Modified:**
- backend/src/moss/client.ts — full refactor
- backend/src/routes/product.ts — upload/diagnose/ask endpoints updated

**Files Removed:**
- backend/src/routes/moss-test.ts
- backend/src/debug/moss.ts
- backend/test_moss.ts

**Files Created:**
- backend/src/moss/chunker.ts — PDF text chunking logic
- backend/src/moss/types.ts — typed MOSS result wrappers
- backend/src/routes/index.ts — (remove mossTestRoute registration)

**Dependency Graph:**
- Task 1 (types + chunker) → Task 2 (client.ts refactor) → Task 3 (product.ts upload) → Task 4 (product.ts diagnose) → Task 5 (product.ts ask) → Task 6 (dead code removal) → Task 7 (verification)

---

### Task 1: MOSS Types & PDF Chunker

**Files:** Create `backend/src/moss/types.ts`, Create `backend/src/moss/chunker.ts`

- Write TypeScript interfaces wrapping MOSS SDK types: `MossQueryResult`, `MossDoc`, `MossError` with discriminated union for error types
- Write a chunking utility that splits raw PDF text into ~300 token chunks with ~50 token overlap
- Strip boilerplate: remove repeated headers, footers, page numbers, excessive whitespace
- Accept raw text input and return `Array<{ text: string; page: number }>`

**Input Contract:** `function chunkText(text: string, pageNum: number): Array<{ text: string; page: number }>`
**Output Contract:** Typed result objects usable by client.ts without `any` casts

---

### Task 2: Core MOSS Client Refactor

**Files:** Modify `backend/src/moss/client.ts`

- Add a shared index constant `MANUALS_INDEX = 'manuals'`
- Replace `new MossClient(...)` singleton with init function that also handles loading the shared index with `cachePath` + `autoRefresh`
- Replace per-product `loadIndex(pid)` + `query(pid, ...)` with single `loadIndex('manuals')` + `query('manuals', ..., { filter: { field: 'productId', condition: { $eq: pid } } })`
- Add hybrid search with `alpha: 0.5` default to all `query()` calls
- Update `queryProductIndexes()` to use `$in` filter for multiple product IDs in one query instead of O(n) loop
- Add `ensureIndexReady()` that lazy-loads the shared index once on first use
- Add typed error handling: wrap MOSS calls and emit typed errors (index not found, unauthorized, not loaded, generic)
- Add session context enrichment: store structured metadata alongside messages (role, type)
- Replace all `any` in query result handling with typed interfaces from Task 1

**Input Contract:** Same function signatures as current `client.ts` exports
**Output Contract:** Same return shapes but with typed internals, shared index behavior, hybrid search

---

### Task 3: Upload-Manual Endpoint Update

**Files:** Modify `backend/src/routes/product.ts` (upload handler)

- Replace `moss.createIndex(productId, docs)` with `moss.addDocs('manuals', docsWithMetadata, { upsert: true })`
- Apply the chunker from Task 1 to PDF text before building docs array
- Add `metadata: { productId, page }` to every document chunk
- Remove the `listIndexes` + `deleteIndex` pre-check logic (no longer needed)
- Remove the meta-info doc pattern (productId in metadata replaces it)
- Keep Supabase storage upload + DB insert unchanged

**Input Contract:** Same POST body (productId, title, description, tags, file, image)
**Output Contract:** Same success/error response shape

---

### Task 4: Diagnose Endpoint Update

**Files:** Modify `backend/src/routes/product.ts` (diagnose handler)

- Replace `moss.loadIndex(productId)` + `moss.query(productId, ...)` with shared index query + metadata filter
- Add hybrid search `alpha: 0.5` to the query options
- Use typed results from Task 1 instead of `(doc: any)`
- Keep the same response shape (text, suggestedActions, manualLinks)

**Input Contract:** Same body (productId, query)
**Output Contract:** Same response shape

---

### Task 5: Ask Endpoint Update

**Files:** Modify `backend/src/routes/product.ts` (ask handler)

- Replace per-product `queryProductIndexes()` with the refactored version from Task 2 (shared index, $in filter, hybrid search)
- Parallelize the two MOSS queries (product indexes + session) with `Promise.all`
- Enrich session context: store assistant conclusions + checked parts in addition to raw messages
- Add `metadata: { role, type }` to session docs for filtering
- Keep the same response shape (answer, suggestedActions, relatedProducts, sessionId, sources)

**Input Contract:** Same body (query, sessionId, productIds)
**Output Contract:** Same response shape

---

### Task 6: Dead Code Removal

**Files:** Remove files, Modify `backend/src/routes/index.ts`

- Delete `backend/src/routes/moss-test.ts`
- Delete `backend/src/debug/moss.ts`
- Delete `backend/test_moss.ts`
- Remove the `import` and `app.use(mossTestRoute)` line from `backend/src/routes/index.ts`

**Verification:** Server starts without import errors, route list shrinks by 1

---

### Task 7: Build Verification

**Files:** None

- Verify backend compiles: `cd backend && bun run --bun src/index.ts`
- Verify no TypeScript errors (no `any` casts remaining in MOSS code paths)
- Verify dead code files are deleted (glob check)
- Verify route table no longer includes `/moss-test`

---

## Verification Criteria
1. Backend starts without errors
2. Uploading a manual creates chunks in the shared `"manuals"` index with proper metadata
3. Diagnose query returns results scoped to a single product (metadata filter works)
4. Ask endpoint returns multi-product results (when multiple productIds sent)
5. Session history still works for conversation context
6. Hybrid search returns results for both semantic queries and exact part number matches
7. All dead code files deleted, route registration updated
8. No `any` types used in MOSS-related code paths

---

## Refined Plan — Improvements (Appended)

### Structural Improvements

- **Task 2 ambiguity resolved**: The "Same function signatures" claim is contradictory with the shared-index refactor. Clarify that export signatures change minimally: `loadIndex(productId)` → `ensureIndexReady()` (no args), `query(indexName, ...)` → `query('manuals', ..., { filter })`. Keep `queryProductIndexes()` name but change internals. The call-site interface changes slightly — all callers in Tasks 3–5 must update their calls.
- **Task 3–5 parallelization note**: After Task 2 completes, Tasks 3, 4, and 5 can be edited in any order or in parallel since each touches distinct branches inside the upload/diagnose/ask handlers. Only the product.ts file is shared across all three.
- **Task 1 chunker scope clarified**: The chunker processes already-extracted PDF text (the upload handler uses a PDF parser upstream). Task 1 must document that input is pre-extracted plain text plus page number alignment — the chunker does not extract PDF text itself.
- **Task 6 import audit**: Before deleting files, grep for imports of `moss-test`, `debug/moss`, and `test_moss` across the entire backend to catch indirect imports that would break after deletion. Clean those imports in the same task.
- **Task 7 expanded**: Add verification step for each refinement — not just compile check. Start the server, hit the `/diagnose` and `/ask` endpoints with known queries, and confirm structured responses. Verify chunk boundaries with a multi-page PDF upload.

### Dependency Fixes

- **Atomic update window**: Task 2 (client.ts) and Tasks 3–5 (product.ts) must be edited together in a single session or atomic commit. If deployed incrementally, the server will be in a broken state between Task 2 and Task 3. Either batch them or document the deployment gap.
- **Chunker depends on PDF parser availability**: The chunker in Task 1 requires raw text + page number. The upload handler in Task 3 must provide both. Add a note that `pdf-parse` (or whatever library is used) must be called before chunking, and page numbers must be tracked during extraction.
- **Index readiness precondition**: Task 2 must include an `ensureIndexReady()` helper that lazily creates the shared `"manuals"` index if it does not exist on first query. Otherwise, the first Diagnose call before any upload will fail. This should be idempotent — check exists first, create only if missing.
- **Graceful degradation added to Tasks 3–5**: Each endpoint must handle MOSS errors (index not found, rate limited, unauthorized) by returning a 200 with empty results and a `mossError` field, not a 500 crash. The typed error system from Task 2 feeds into this — endpoints switch on error discriminant.

### Skill Enhancements

- **Architecture — index lifecycle management**: Add a section to Task 2 defining ownership of the shared index: who creates it, who refreshes it, who deletes stale documents. The `cachePath` + `autoRefresh` handles persistence, but the plan should note that the first deploy must ensure the index exists (an init step in server startup or on first use).
- **Architecture — concurrency on index writes**: Multiple concurrent uploads calling `addDocs('manuals', ...)` target the same index. MOSS SDK likely serializes writes, but note this as an architectural assumption. If contention becomes an issue, a simple in-process write lock (Mutex) protects against interleaved updates.
- **Clean Code — chunker purity**: The chunker in Task 1 must be a pure function with no side effects, no file I/O, no global state. Its only job is `string → Array<{text, page}>`. Boilerplate stripping (headers, footers, page numbers) uses simple regex heuristics — extract these into named constants for readability.
- **Clean Code — client.ts separation of concerns**: Split the refactored client into three internal responsibilities: (1) index lifecycle (ensureIndexReady, cachePath, autoRefresh), (2) query execution (search with hybrid + filter), (3) error translation (MOSS errors → typed discriminants). Keep these as internal functions rather than one monolithic export.
- **API Patterns — consistent error envelopes**: All three endpoints (upload, diagnose, ask) must return the same error shape on MOSS failures: `{ success: false, error: { code, message, details? } }`. The typed error system from Task 2 should map MOSS SDK error codes to these envelope fields. This ensures API consumers get predictable responses regardless of which MOSS operation fails.

### Risk Mitigations

- **Orphaned old indexes**: The plan deletes per-product index creation but does not migrate or clean up existing indexes. Those remain in the MOSS cloud with stale data. Add a one-time cleanup step in Task 6 or 7: call `listIndexes()`, identify per-product indexes, and optionally delete them via the MOSS API. This is not critical for correctness but prevents confusion during debugging.
- **Chunk size tuning unknown**: 300 tokens is a starting heuristic. The plan should make chunk size configurable (env var or constant) so it can be adjusted without code changes. Document that the optimal size depends on MOSS model context window and typical document structure.
- **No rollback on partial addDocs failure**: If `addDocs` fails mid-upload (e.g., after 50 of 100 chunks), the index is left with a partial document. The plan should note this risk — acceptable at current scale, but a future improvement could wrap uploads in a transaction (if MOSS SDK supports it) or track uploaded chunk count for retry.
- **Shared index query performance at scale**: With many products in one index, queries with `$eq` filtering may slow down. MOSS likely indexes the metadata field efficiently, but if latency grows, consider adding a compound filter or monitoring query response times as a future trigger for index sharding.

### Planner Feedback

- **Major Weakness Fixed**: Contradictory "same function signatures" claim in Task 2 resolved. Atomic update window between client.ts and product.ts is now documented. Graceful degradation strategy added to all endpoints. Index readiness precondition is now explicit.
- **Remaining Risks**: Orphaned old indexes remain in MOSS cloud (low impact). Chunk size may need tuning post-deployment. Partial addDocs failure has no rollback. Shared index performance at scale not yet validated.
- **Suggested Focus for Next Iteration**: Data migration script to clean up per-product indexes. Observability for MOSS query latency. Chunk size A/B testing. Rate limit handling for MOSS Developer plan quotas.

---

## Pass 2 Refinements — Database, Performance, Testing

### Database Design — Metadata Schema & Document Identity

- **Metadata schema as first-class interface**: Define a `ManualChunkMeta` interface in `types.ts` with exact fields: `productId: string`, `page: number`, `chunkIndex: number`, `manualTitle?: string`, `uploadedAt: string`. This is the document schema for the shared index — every chunk follows this shape. Document it alongside the MOSS SDK wrappers so consumers know which fields are queryable via `$eq` filter.
- **Unique document ID scheme for upsert reliability**: Each chunk needs a deterministic `_id` for `addDocs(..., { upsert: true })` to match correctly. Define the scheme as `${productId}-${page}-${chunkIndex}` (or `${manualId}-${page}-${chunkIndex}` if a manual-level ID is available). Without a stable ID, re-uploading the same manual creates duplicate chunks instead of replacing them.
- **Stale chunk cleanup on manual re-upload**: When a manual is re-uploaded, old chunks for that productId remain unless explicitly removed. The plan should either: (a) query for existing chunks with that `productId` + `manualTitle` and delete them before `addDocs`, or (b) accept duplicates as a known limitation and document it. Option (a) is cleaner but adds a round-trip — add it as a sub-step in Task 3.
- **Chunk document normalization**: Each chunk doc in MOSS should carry a stable `text` field + `metadata` object. The `metadata` object is the queryable filter surface. The `text` field is the embedding source. Do not put filter fields in `text` — keep the separation clean to avoid polluting embeddings.
- **Filter field indexing consideration**: MOSS metadata filtering performance depends on cardinality. `productId` with low cardinality (tens of products) is efficient. `page` with high cardinality (hundreds of pages) may cause slower filters. The plan should note this trade-off: if diagnose queries filter by `productId` alone, `page` granularity is unnecessary in the filter — only include it if queries need page-scoped narrowing.

### Performance Profiling — Baseline, Metrics & Tuning

- **Baseline measurement before refactoring (add to Task 1 or Task 0)**: Before touching any code, measure and record current endpoint latencies for diagnose and ask with known inputs. Use `bun run` with manual timing or a simple script. Record: diagnose p50/p95 latency, ask p50/p95 latency, MOSS query count per request, cache miss rate (currently 100% since no caching). Without a baseline, no performance improvement can be validated.
- **Add latency logging to Task 2 client refactor**: Instrument every MOSS SDK call in the refactored client with a lightweight duration wrapper. Log operation name + duration at `debug` level. This enables before/after comparison and production monitoring without external tooling. Wrap the wrapper in a `logDuration(label, fn)` utility that returns `{ result, durationMs }`.
- **Explicit latency target for Task 5 parallelization**: Set a measurable target before implementing: diagnose latency should not exceed 2s p95, ask latency should not exceed 3s p95. These targets give the implementation a pass/fail criterion beyond "it compiles." Document them in Task 5's output contract.
- **Chunk size vs query latency trade-off**: 300-token chunks are smaller than a typical PDF page (500-1000+ tokens). More chunks per document = more MOSS results to rank = higher query latency. Add a note in Task 1 that chunk size directly affects end-to-end query time and should be validated against the latency target. If query latency exceeds targets, increase chunk size (reducing total chunks) and re-test.
- **Cache hit ratio metric in Task 2**: `autoRefresh` + `cachePath` only help if the cache is actually hit. Add a simple in-memory counter (`cacheHits`, `cacheMisses`) that logs the ratio on a periodic interval or every N queries. This tells operators whether the disk cache is effective or if the auto-refresh TTL is too short.
- **Hybrid search alpha validation**: `alpha: 0.5` is a reasonable default but may not be optimal for this domain (technical manuals with many exact part numbers). Add a note in Task 2 that the plan should include a mechanism to expose `alpha` as a tunable parameter (env var or per-query option) so it can be adjusted without a deploy. The default stays `0.5` but the architecture supports override.

### Testing Patterns — Unit, Integration & Mock Strategy

- **Task 7 split into two phases**: Phase A — compile verification (existing). Phase B — automated test execution. Convert the manual verification checklist into automated tests. The test suite validates the same 8 criteria but runs on every change, not just at the end.
- **Chunker unit tests (add test file alongside chunker.ts)**: The chunker in Task 1 is a pure function — ideal for fast unit tests. Required test cases: (1) empty text returns empty array, (2) text under 300 tokens returns single chunk, (3) text over 300 tokens produces correct number of chunks, (4) overlap tokens appear in both adjacent chunks, (5) boilerplate stripping removes known headers/footers, (6) page tracking preserves page numbers across chunk boundaries. These live in `backend/src/moss/chunker.test.ts`.
- **Mock MOSS client for integration tests**: The refactored client in Task 2 depends on the MOSS SDK remote service. Unit-testing it requires a mock. Define a `MossClientMock` class that implements the same internal interface and returns controlled responses — successful query, empty query, error states (index not found, unauthorized, rate limited). This mock is injected into the endpoint handlers during tests so that Tasks 3-5 can be verified without network access.
- **Graceful degradation integration tests (Tasks 3-5)**: For each endpoint (upload, diagnose, ask), add an integration test that: (1) injects the mock MOSS client configured to throw each error type, (2) confirms the endpoint returns a 200 with a `mossError` field (not a 500), (3) confirms the response body still has the expected shape (empty results, no crash). This validates the graceful degradation strategy is wired correctly.
- **Test data factory for MOSS query results**: Query results reference real products, sessions, and chunks. Define a factory function `buildMockMossResult(overrides?)` that returns a complete typed `MossQueryResult` with realistic defaults. This keeps test setup minimal and prevents brittle test data.
- **Task 2 refactor testability requirement**: The refactored client must accept an optional mock MOSS SDK instance in its constructor or init function. Without this seam, tests must mock at the module level (vitest.mock) which is fragile. The production init uses the real SDK, tests inject the mock. Add this as a design constraint in Task 2.
- **Verification criteria 6 automated**: "Hybrid search returns results for both semantic queries and exact part number matches" is currently manual. Add a test that: (1) seeds the mock index with chunks containing both semantic prose and exact codes (e.g., "Error code E-1024"), (2) queries with a semantic query and confirms results, (3) queries with an exact code and confirms results, (4) confirms the result set is not identical (hybrid blending changes ranking). This validates hybrid search end-to-end in a controlled environment.

### Planner Feedback — Pass 2

- **Major Weakness Fixed**: Missing baseline measurement before refactoring is now explicit. Chunk document identity and upsert matching are now specified. Testability is now a design constraint, not an afterthought. Graceful degradation now has automated test coverage.
- **Remaining Risks**: Metadata filter performance at high cardinality not yet validated. Chunk size tuning is a manual process without automated benchmarks. No rollback for partial index writes. Old per-product indexes remain in the cloud.
- **Suggested Focus for Next Iteration**: Automated performance regression tests that run before and after each deploy. Index write idempotency (retry + deduplication). Observability dashboard for MOSS query latency, cache ratio, and filter performance.

---

## Pass 3 Refinements — Immediate Edge Cases

These edge cases would break or silently corrupt behavior during current execution. Future out-of-scope risks (chunk size A/B testing, data migration of old indexes, full observability dashboards) are explicitly filtered out.

### Task 1 — Chunker Edge Cases

- **Empty text input**: If `pdf-parse` produces an empty string (corrupt page, blank page), the chunker must return an empty array. Do not attempt to chunk zero-length input. Avoid crashing with a division-by-zero in the token-slicing math.
- **Text shorter than overlap window**: If the page text is 30 tokens and the overlap is 50 tokens, the chunker must clamp overlap to `min(overlap, textLength / 2)` or simply return a single chunk without overlap. Never let overlap exceed text length — this produces inverted indices and out-of-bounds slicing.
- **All-boilerplate text**: After stripping headers, footers, page numbers, and whitespace, the remaining text may be empty. The chunker must detect this and return an empty array rather than a chunk containing only whitespace or empty string.
- **Non-printable characters in PDF text**: PDF text extraction may include control characters, Unicode replacement characters, byte-order marks, or ligatures that MOSS SDK rejects or embeds poorly. The chunker must strip non-printable characters (control chars below U+0020 except newline/tab) before returning chunks. This prevents silent embedding corruption.
- **Token counting heuristic**: No standard tokenizer is available in Bun/Node.js without a dependency. The chunker must use a character-count heuristic: approximate 1 token per 4 characters for English text. Document this as an approximation on the chunker constant. Never depend on an external tokenizer library — keep chunker zero-dependency.
- **Over-stripping guard**: Boilerplate regex patterns may accidentally match page content (e.g., a page containing a technical code that looks like a page number). If post-strip length is less than 50% of pre-strip length, log a warning and use the original un-stripped text instead of the stripped text. This prevents the chunker from silently throwing away meaningful content.
- **Single-page-at-a-time constraint**: The chunker receives one page at a time. It cannot merge content across page boundaries. This means a sentence split across a page break produces two partial sentences in adjacent chunks. The overlap mechanism mitigates this (the end of page N appears at the start of page N+1's first chunk), but the plan should note this as an inherent limitation of page-level chunking. Future improvement: pass the full document text once with page markers embedded.

### Task 2 — Client Refactor Edge Cases

- **Race condition on concurrent first access**: If two requests call `ensureIndexReady()` simultaneously before the index is loaded, both may attempt to load the index, causing duplicate in-flight requests and potential double-creation. The init function must use a promise-caching pattern: store the pending promise on first call and return the same promise to all concurrent callers until it resolves. A boolean flag is insufficient — the window between the flag check and the async load start still allows races.
- **Cache directory does not exist**: The `cachePath` directory must be created recursively if absent. The init function must call `mkdir` (recursive) before writing the cache file. If `mkdir` fails (permissions, read-only filesystem), log a warning and continue without disk caching — silently fall back to memory-only mode. Never crash the server because the cache directory is unwritable.
- **File descriptor leak on auto-refresh timer**: Each `autoRefresh` cycle loads the index from disk, which opens file handles. If the timer ticks every N minutes without cleanup, handles accumulate. The client must close/release the previous index handle before loading the new one. Add a `dispose()` export for graceful shutdown (e.g., on server SIGTERM) that clears the refresh timer and releases handles.
- **MOSS API unreachable during ensureIndexReady**: If the MOSS cloud API is down when `ensureIndexReady()` fires, the HTTP request times out or throws. The typed error system must catch this and emit an `indexNotLoaded` error variant — not an unhandled promise rejection. The error must include the raw cause message for debugging. The caller (endpoint) is expected to switch to degraded mode on this error.
- **MOSS SDK error shapes unknown**: The plan assumes MOSS SDK throws discriminated error types, but the actual SDK may throw a generic `Error` with a string message. The error mapping layer must handle this: attempt to parse the error message for known patterns (unauthorized, not found, rate limited), and fall back to a `generic` type with the raw message preserved. Never crash because an error didn't match an expected shape.
- **Query invoked while init is still in-flight**: If `ensureIndexReady()` is still loading (e.g., 2-second network fetch), a concurrent `query()` call must await the same pending promise, not attempt a second load. Solved by the promise-caching pattern described above. Without this, the second call triggers a redundant loadIndex and may query against a not-yet-ready index.

### Task 3 — Upload Edge Cases

- **PDF parsing failure**: The upload handler saves the file to Supabase storage first, then extracts and indexes text. If `pdf-parse` fails (corrupt PDF, encrypted PDF, truncated upload), the Supabase storage save has already succeeded. The MOSS indexing step must be wrapped in a try-catch that logs the error and continues — do not roll back the file storage. The user retains their uploaded file for download; only the search index is missing for that document.
- **Non-PDF file uploaded**: The route accepts a generic `file` field. A user may upload `.txt`, `.png`, or `.zip` files that cannot be parsed. The handler must check MIME type (from `file.mimetype`) or file extension before passing to `pdf-parse`. If the file is not a PDF, skip MOSS indexing entirely — do not attempt parsing. The file is still saved to Supabase storage and registered in the DB.
- **Empty chunks array from chunker**: If the chunker returns an empty array (empty text, all-boilerplate, zero-length PDF), the handler must skip the `addDocs` call entirely. Calling `addDocs('manuals', [])` may be a no-op or may throw depending on the MOSS SDK — avoid the call entirely. Log a warning that no searchable content was extracted from the PDF.
- **Concurrent uploads of the same product**: Two users uploading different manuals for the same productId simultaneously both call `addDocs('manuals', ...)` at the same time. If the chunk ID scheme uses `productId + page + chunkIndex` and the two manuals have different page counts, there is no collision — IDs are unique. But if two manuals have the same filename or structure, IDs may overlap and the second upload's chunks silently overwrite the first's. Document this as expected behavior (last-write-wins) rather than a bug — the user should know that uploading a manual with the same title replaces the old one.

### Task 4 — Diagnose Edge Cases

- **Empty or whitespace-only query string**: If the client sends `query: ""` or `query: "   "`, the handler must reject with a 400 before any MOSS call. Pass an empty query to MOSS and it may return random results or throw. Early validation prevents this. Add a guard at the top of the handler: trim the input, check length > 0, return 400 if empty.
- **Index not yet created (no uploads exist)**: If no manuals have been uploaded yet, the shared `"manuals"` index does not exist in MOSS. `ensureIndexReady()` returns an `indexNotLoaded` typed error. The handler must catch this and return a valid 200 with empty results (`{ text: "", suggestedActions: [], manualLinks: [] }`) and a `mossError` field. Never return a 500 for this case — it is an expected state on a fresh deploy.
- **productId with no matching chunks**: If a product has no manuals uploaded, the filter query returns zero results. The handler must return a valid empty response (same shape as above) — not a 404, not a crash. Zero results is a valid query outcome.

### Task 5 — Ask Edge Cases

- **`Promise.all` partial failure loses data**: The two parallel queries (product indexes + session) run via `Promise.all`. If one fails, `Promise.all` rejects immediately and the successful result is discarded. Use `Promise.allSettled` instead: gather both results independently, check each status, and merge partial data. If the product query fails, still return session results. If the session query fails, still return product results. Never discard a successful query because a parallel one failed.
- **Empty `productIds` array**: The Ask endpoint receives `productIds: []`. Passing an empty array to the `$in` filter may throw or return all documents in the index (security issue). The handler must guard: if `productIds` is empty, skip the product index query entirely and only search the session history. Return results with an empty `relatedProducts` field.
- **Missing or expired session**: If `sessionId` does not exist (expired, deleted, never created), the session query returns nothing. The handler must handle this gracefully: if no session data is returned, treat it as a fresh conversation with no history. Do not create a new session implicitly — let the caller decide. Return an empty session context rather than crashing.
- **Session enrichment with no prior conclusions**: On the first message of a session, there are no "conclusions" or "checked parts" yet. The enrichment logic that adds structured metadata must default these fields to empty arrays. Never access `.conclusions` on undefined. The metadata merge must use optional chaining or nullish coalescing.

### Task 6 — Dead Code Edge Cases

- **File already deleted (missing)**: One of the three target files may have been removed by a prior partial execution or manual cleanup. The deletion step must use `rm(path, { force: true })` or check `existsSync` before attempting deletion. An unhandled `ENOENT` error stops the whole task.
- **Import line format variance in index.ts**: The `import` line for `mossTestRoute` may have inconsistent whitespace, single vs double quotes, or may be part of a multi-import block (`import { a, b, mossTestRoute } from '...'`). The task must use a regex-based removal that matches common import patterns rather than an exact string match. After removal, check for resulting double-blank-lines and collapse them to one.
- **Other files referencing dead code**: The three target files may be imported or referenced outside `index.ts` (e.g., in a barrel export or a test config file). The task must add a final glob for remaining references after deletion: search `require(` and `from ` strings containing each filename. If any remain, the server will fail to start.

### Task 7 — Verification Edge Cases

- **Server starts but crashes immediately**: `bun run --bun src/index.ts` may succeed in starting the process but crash within milliseconds due to missing MOSS env vars, DB connection failure, or port conflict. The verification step must wait at least 3 seconds after the process starts and confirm it is still running (check PID or poll a health endpoint). A process that starts and immediately exits is not a valid start.
- **Port already in use**: The dev server may fail if the configured port is occupied. The verification script must detect this specific error (EADDRINUSE) and report it clearly rather than showing a generic "start failed" message. Optionally, use a fallback port for verification.
- **MOSS env vars not set**: If `MOSS_API_KEY` or `MOSS_ORG_ID` are missing, the server starts but every MOSS call returns authentication errors. The verification script must check that required env vars are set before attempting MOSS-dependent tests. If missing, skip MOSS integration tests and report which vars are unset.
- **No test PDF fixture available**: Chunk boundary verification requires a PDF with known content. The verification step must either: (a) generate a small PDF programmatically, or (b) locate an existing test PDF in the repo. Without one, the chunk boundary check cannot run. Add a sub-step to create or identify a test fixture before running the verification.

### Pass 3 — Filtered Out (Not Immediate, Out of Scope for This Execution)

The following were considered but explicitly excluded — they are valid concerns for future iterations:
- Metadata filter performance at high cardinality (requires large dataset to test)
- Chunk size A/B testing framework (requires production traffic or benchmark harness)
- Observability dashboard for MOSS metrics (separate feature track)
- Data migration of old per-product indexes (one-time script, not part of the core refactor)
- Transaction support for partial addDocs failures (MOSS SDK limitation, not fixable in this pass)
- Auto-scaling or index sharding (speculative, not needed at current scale)

### Planner Feedback — Pass 3

- **Major Weakness Fixed**: Race condition on concurrent `ensureIndexReady()` access is now explicitly prevented via promise caching. `Promise.all` replaced with `Promise.allSettled` to preserve partial results. PDF parsing failure is now decoupled from file storage (non-fatal). Empty/null inputs are guarded at every endpoint. Empty productIds, sessions, and chunks arrays are handled without crashes. Dead code removal handles already-deleted files and import variance. Verification now checks runtime health (not just compile).
- **Remaining Risks (within scope)**: Boilerplate stripping accuracy depends on regex quality against real PDF formats. Chunk overlap math needs careful integer handling for small texts. Task 2 and Tasks 3-5 must be deployed atomically. MOSS env var absence is detected but not auto-healed.
- **Suggested Focus for Next Iteration**: Move filtered-out items (migration script, performance benchmarks, observability) into a separate feature backlog. The current plan is ready for execution — all immediate edge cases are addressed.
