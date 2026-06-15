# Plan: Persistent Diagnostic Conversations

## Objective
Replace hardcoded demo conversation list on the `/diagnostics` page with user-owned, Supabase-backed persistent conversations that survive page refresh.

## Architecture
Add a `conversations` table to Supabase and a thin CRUD route group in the Elysia backend. Frontend swaps static array for API fetch. Messages remain ephemeral in MOSS sessions — only the conversation list (title, timestamp) is persisted.

## Task Breakdown

### Task 0: Migration Validation Gate
- Before Task 1 migration runs, verify the Supabase connection is live and the `auth.users` table exists (FK dependency)
- Add a startup health probe in the backend that warns on connection failure
- This prevents silent migration failures during development/deployment

### Task 1: Supabase Migration — `conversations` table
- **File:** `backend/supabase/migrations/005_create_conversations.sql`
- Schema:
  - `id` UUID PK default `gen_random_uuid()`
  - `title` TEXT default `'New Diagnostic'`
  - `user_id` UUID FK to `auth.users`, NOT NULL (loose reference — no explicit FK constraint, intentional)
  - `product_id` TEXT nullable (non-FK loose reference, intentional)
  - `created_at` TIMESTAMPTZ default NOW()
  - `updated_at` TIMESTAMPTZ default NOW()
- Include `updated_at` auto-update trigger function
- Use `CREATE TABLE IF NOT EXISTS` for idempotent re-runs
- Enable RLS with policy: `user_id = auth.uid()` for SELECT, INSERT, UPDATE, DELETE
- Composite B-tree index on `(user_id, updated_at DESC)` for efficient user-scoped list queries
- Keep down-migration SQL as a comment block in the migration file

### Task 2: Backend Route — `conversations` CRUD
- **File:** `backend/src/routes/conversations.ts`
- Extract an ownership verification helper (reusable for PATCH and DELETE)
- New Elysia route group guarded with `requireAnyAuth()`
- Input validation via Elysia `t.Object` body schemas (title max 120 chars, product_id pattern if provided)
- `GET /api/conversations` — Select user-scoped records, ordered by `updated_at DESC`. Support optional pagination (`?limit`, `?offset`)
- `POST /api/conversations` — Insert with `user_id` from auth context, optional `product_id` from body. Return created record with **201 Created**
- `PATCH /api/conversations/:id` — Update title (and optionally product_id). Verify ownership via helper. Return 404 for non-existent
- `DELETE /api/conversations/:id` — Delete by id. Verify ownership. Return **204 No Content**. Return 404 for non-existent
- Response envelope: choose direct or envelope format and apply it consistently across all routes
- **Register:** Import and mount in `backend/src/routes/index.ts`

### Task 3: Frontend — Load real conversations
- **File:** `frontend/src/app/diagnostics/page.tsx`
- Remove hardcoded `conversations` array and `Conversation` local interface
- Add `useAuth()` to get `getAccessToken`
- Handle expired/null token gracefully (401 → redirect or silent refresh)
- Add `useEffect` on mount to fetch `GET /api/conversations` with Bearer token
- Show skeleton loading state during fetch (reduces perceived latency)
- Store result in state; render dynamically like before
- Show empty state with icon and "No conversations yet" message when list is empty
- Handle fetch failure with error toast/state rather than silent failure
- Keep the page component lean — extract sidebar into its own component if it grows beyond ~100 lines

### Task 4: Frontend — Wire new-conversation button
- **File:** `frontend/src/app/diagnostics/page.tsx`
- `+` button calls `POST /api/conversations` (no title yet), receives created record back
- Disable button during pending POST to prevent double-click race condition
- Adds new conversation to local state and selects it
- Title auto-updates: when user sends first message, call `PATCH /api/conversations/:id` with title derived from the first query (truncated to ~60 chars). Guard against empty/whitespace-only messages
- Inline title editing via double-click on the title (progressive disclosure — no separate edit view)

### Task 5: Frontend — Conversation deletion
- **File:** `frontend/src/app/diagnostics/page.tsx`
- Add delete button (trash icon) on each conversation item in the sidebar
- Show lightweight confirm dialog before delete (not browser `alert()` — with undo consideration)
- Calls `DELETE /api/conversations/:id`, removes from local state
- Debounce rapid delete clicks to prevent race conditions

## Dependency Graph
Task 0 (validation gate) → Task 1 (migration must exist before routes)
Task 1 → Task 2 (migration must exist before routes)
Task 2 → Task 3 (backend must serve before frontend fetches)
Task 3 → Task 4 (list must load before new conversation makes sense)
Task 5 can be parallel with Task 4

## Verification Strategy
### Integration Tests (backend):
- Create conversation → verify 201 + record returned
- Fetch conversation list → verify user-scoped filtering
- Update title → verify 200 + ownership check
- Delete conversation → verify 204 + ownership check
- Delete non-existent → verify 404
- Update non-existent → verify 404
- Request without auth token → verify 401
- Request for another user's conversation → verify 403

### Frontend Smoke Tests:
- Page load with auth → conversations render from API (not hardcoded)
- Page load without auth → redirect or handled gracefully
- Page load with empty list → empty state renders
- + button click → new conversation appears and is selected
- First message sent → title updates
- Delete → confirm dialog shows, conversation removed on confirm
- Page refresh → persisted conversations still visible

## Edge Cases (Documented)
- **Migration re-run safety:** `IF NOT EXISTS` guard on CREATE TABLE
- **Auth token expiration:** Frontend must handle 401 gracefully (silent refresh or redirect)
- **POST without product_id:** Backend must handle missing optional body field
- **PATCH/DELETE 404:** Explicit not-found handling in route handlers
- **Double-click debounce:** Button disabled during pending POST
- **Empty title guard:** First-message title derivation must handle whitespace-only input
- **RLS trust boundary:** Supabase RLS + backend ownership middleware is defense-in-depth; backend middleware is the primary auth gate
- **Concurrent operations:** Frontend state management must handle rapid create/delete sequences without stale state

## Filtered Out (Future Iteration)
- Soft-delete conversations (hard-delete sufficient for now)
- Bulk operations (delete all, reorder)
- Conversation archiving or pinning
- Cross-user conversation sharing
- Real-time cross-tab sync via WebSocket
- Conversation export/import
- Sidebar search or filter

## Verification Criteria
- Backend compiles: `bun run dev` starts without errors
- Frontend compiles: `bun run build` in frontend/ succeeds
- Tests pass: 5 pass, 3 pre-existing failures (unchanged)
- On diagnostics page with auth: conversation list loads from API instead of hardcoded
- New conversation appears in list after + button click
- Title updates after first message
- Delete removes conversation from list
- Refresh shows persisted conversations

## Files Changed
- NEW: `backend/supabase/migrations/005_create_conversations.sql`
- NEW: `backend/src/routes/conversations.ts`
- MODIFY: `backend/src/routes/index.ts`
- MODIFY: `frontend/src/app/diagnostics/page.tsx`
