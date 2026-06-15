# Context: Knowledge Repository & Diagnostic Assistant

## Snapshot
- Three refinement passes completed on 2026-06-15
- Pass 1: Backend/infrastructure gaps (7 gaps: storage lifecycle, validation, auth, migration safety)
- Pass 2: Frontend architecture & UX resilience (component decomposition, error boundaries, loading states, mobile, user feedback)
- Pass 3: Immediate edge cases (cross-company access, bucket missing, file too large, crash mid-upload, product deletion cascades)
- Refined plan at `.brain/PLANS/plan-2026-06-15-knowledge-repository.md`

## Decisions Made — Pass 1 (Backend)
1. Storage bucket check/creation as Task 0
2. DELETE endpoint cleans up storage files before DB row
3. POST body uses `t.File()` with MIME type validation + 50MB cap
4. DELETE verifies resource product belongs to user's company
5. GET resources supports `?limit` and `?offset` pagination
6. Migration validation gate between Task 1 and Task 2
7. Down migration SQL kept as comment in migration file
8. Composite index `(product_id, type)` recommended
9. RLS trust boundary documented — backend middleware is the auth gate

## Decisions Made — Pass 2 (Frontend)
1. Component decomposition into 8 focused files (6 product detail + 5 dashboard utilities with 3 shared)
2. Build inline first, extract after verification
3. 4-layer error defense: ErrorBoundary, retry with backoff, upload state machine (5 states), aria-live a11y
4. Skeleton loading with 300ms minimum display, 4-phase lifecycle
5. Mobile: scroll-snap tabs, 2-column mode selector, vertical card stacking below 480px, tap-to-select on mobile
6. Shared components (Skeleton, ErrorBoundary, UploadStatusToast) built before extraction

## Decisions Made — Pass 3 (Immediate Edge Cases)
1. **Cross-company ownership gate:** Both POST and DELETE must verify `product.company_id === user.company_id`. Return 403 with clear error. Do NOT return 404 (avoids leaking product existence to unauthorized users).
2. **Storage bucket missing:** Do NOT auto-create bucket in handler (may lack permissions). Add startup health probe that warns on failure. POST handler translates Supabase 404 to structured 503: "Storage unavailable. Contact administrator." Document manual bucket creation in README.
3. **File too large — dual enforcement:** Elysia body parser limit (413) + application-level check with structured error. Client-side pre-check in FileUploadZone to avoid wasted upload.
4. **Mid-upload crash:** Restructure POST to DB-first-then-storage. Insert DB row first, upload file second. If upload fails, delete DB row as compensation. Frontend shows "Refresh to verify" on timeout, not auto-retry.
5. **Product deletion cascades:** ON DELETE CASCADE handles DB rows. Storage blobs become orphaned — documented as known limitation. No automated cleanup in this scope. Operations note added.

## Filtered Out (Future Iteration)
- Thumbnail generation for images
- Video transcoding
- Full-text search across non-PDF resources
- Analytics/resource download tracking
- Admin purge endpoint for orphaned storage blobs

## Notes for Next Agent
- All 5 edge cases have testable assertions documented in Pass 3
- Edge cases 1 (403) and 3 (413) can be fully automated in CI
- Edge cases 2, 4, 5 require manual verification or pre-release sanity checks
- The POST handler structure must change from "storage-then-DB" to "DB-then-storage" (addressing EC4)
- The ownership gate logic is shared between POST and DELETE — extract into a reusable helper function
- Do NOT auto-create the storage bucket — document the manual step instead
