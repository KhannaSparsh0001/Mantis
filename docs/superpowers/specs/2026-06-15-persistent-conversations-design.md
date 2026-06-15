# Design: Persistent Diagnostic Conversations

**Date:** 2026-06-15
**Status:** Implemented

## Overview

Replace the hardcoded demo conversation list on the `/diagnostics` page with user-owned, Supabase-backed persistent conversations that survive page refresh. Messages remain ephemeral in MOSS sessions (diagnostic context), but the conversation list (title, creation time, linked product) is persisted.

## 1. Database — `conversations` Table

```sql
CREATE TABLE IF NOT EXISTS conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT DEFAULT 'New Diagnostic',
  user_id     UUID NOT NULL,
  product_id  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

- `user_id` is a loose reference (no explicit FK constraint) to keep the migration simple
- `product_id` is a nullable loose reference for linking conversations to a product
- `updated_at` auto-updates via a trigger function
- RLS policies enforce `user_id = auth.uid()` for all CRUD operations
- Composite B-tree index on `(user_id, updated_at DESC)` for efficient user-scoped queries

## 2. API — `conversations` CRUD

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/conversations?limit=50&offset=0` | Required | List user's conversations |
| `POST` | `/api/conversations` | Required | Create conversation (optional `productId`) |
| `PATCH` | `/api/conversations/:id` | Required | Update title (ownership checked) |
| `DELETE` | `/api/conversations/:id` | Required | Delete conversation (returns 204) |

- All endpoints guarded with `requireAnyAuth()`
- Ownership verified server-side by filtering on `user_id` from auth context
- Elysia `t.Object` input validation (title max 120 chars)

## 3. Frontend — `/diagnostics` Page

### Data Flow
1. On mount: fetch `GET /api/conversations` with Bearer token
2. Show skeleton loading while fetching
3. Empty state: "No conversations yet" icon+message
4. `+` button: POST to create conversation, add to list, auto-select
5. Click conversation: set as active, render DiagnosticAssistant with `product_id`

### Product-Linked Auto-Create
- When navigating from Diagnose button (`?product=PRODUCT_ID`):
  - Wait for conversation list to load
  - If no existing conversation with that `product_id`, create one with title "Diagnosing: [Product Name]"
  - UseRef guard prevents duplicate creation on re-renders
- Title auto-updates on first user message via `onFirstMessage` callback

### Deletion
- Hover reveals trash icon per conversation
- Inline "Delete? Yes/No" confirmation
- DELETE request removes from backend + local state

## 4. Key Decisions
- Messages stay in MOSS sessions — persisting them would duplicate storage without user-visible benefit
- `useRef` guards prevent duplicate auto-creation on re-renders
- Loose FK references simplify migration management
