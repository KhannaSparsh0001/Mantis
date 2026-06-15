# Context: Persistent Diagnostic Conversations

## Date
2026-06-15

## State
The `/diagnostics` page now loads conversations from `GET /api/conversations` (Supabase-backed) instead of hardcoded demo data. Conversations persist across page refresh. Messages remain ephemeral in MOSS sessions.

## API Surface Added
- `GET /api/conversations?limit=50&offset=0` — List user's conversations (auth required)
- `POST /api/conversations` — Create new conversation (auth required)
- `PATCH /api/conversations/:id` — Update conversation title (auth required, ownership check)
- `DELETE /api/conversations/:id` — Delete conversation (auth required, ownership check)

## Frontend Behavior
- On mount: fetches conversations, shows skeleton while loading
- Empty state: icon + "No conversations yet" when list is empty
- Create: + button POSTs to backend, adds to list, auto-selects
- Title: auto-updates from first user message (PATCH) via `onFirstMessage` callback
- Delete: hover reveals trash icon → inline "Delete? Yes / No" confirm
- Error: fetch error shown inline; 401 shows "Session expired" message

## Key Design Decisions
- `user_id` is a loose reference (no explicit FK constraint) — keeps migration simple and aligns with plan's intentional choice
- `product_id` is a nullable loose reference — future-proofing without constraint
- `updated_at` auto-updates via trigger function
- RLS provides defense-in-depth; backend ownership check is the primary gate
- DELETE returns 204 No Content per REST convention
