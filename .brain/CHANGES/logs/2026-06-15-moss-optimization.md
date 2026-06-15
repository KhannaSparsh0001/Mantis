# MOSS Index Optimization & Diagnostic Quality

## Date
2026-06-15

## Summary
Consolidated per-product MOSS indexes into a single shared `"manuals"` index with metadata filtering, improved PDF chunking quality, added hybrid search, parallelized queries, added disk caching + auto-refresh, typed error handling, and removed dead code.

## Files Created
- `backend/src/moss/types.ts` — typed MOSS result wrappers
- `backend/src/moss/chunker.ts` — PDF text chunker (300-token with 50-token overlap)

## Files Modified
- `backend/src/moss/client.ts` — full refactor: shared index, hybrid search, disk cache, auto-refresh, typed errors
- `backend/src/routes/product.ts` — upload/diagnose/ask endpoints updated
- `backend/src/routes/index.ts` — removed `mossTestRoute` registration

## Files Deleted
- `backend/src/routes/moss-test.ts`
- `backend/src/debug/moss.ts`
- `backend/test_moss.ts`

## Key Decisions
- Single shared index `"manuals"` instead of per-product indexes (fixes Developer plan's 3-index limit)
- Metadata filtering with `{ productId, page, chunkIndex }` for product-scoped queries
- Hybrid search `alpha: 0.5` for keyword+semantic blend on technical content
- Chunk documents by ~300 tokens with ~50 token overlap for better embedding signal
- `addDocs` with upsert instead of delete+recreate for index updates
- `Promise.allSettled` instead of sequential queries for lower latency
- Disk cache with auto-refresh for persistence across restarts
