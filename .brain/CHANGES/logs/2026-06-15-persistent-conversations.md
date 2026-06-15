# Change Log: Persistent Diagnostic Conversations

**Date:** 2026-06-15
**Phase:** Execution — Persistent Diagnostic Conversations
**Plan:** `.brain/ARTIFACTS/plans/persistent-conversations-plan.md`

## Summary
Replaced hardcoded demo conversation list on `/diagnostics` with user-owned, Supabase-backed persistent conversations.

## Files Created
- `backend/supabase/migrations/005_create_conversations.sql` — Conversations table with RLS, updated_at trigger, composite index
- `backend/src/routes/conversations.ts` — CRUD endpoints (GET, POST, PATCH, DELETE) guarded by requireAnyAuth()

## Files Modified
- `backend/src/routes/index.ts` — Registered conversationRoutes
- `frontend/src/app/diagnostics/page.tsx` — Removed hardcoded conversations; loads from API with skeleton loading, empty state, error handling; create/delete/auto-title flows with confirm dialog
- `frontend/src/components/DiagnosticAssistant.tsx` — Added onFirstMessage callback prop for auto-title update

## Verification
- Backend: Compiles and starts on localhost:8000
- Frontend: Next.js production build compiles (0 errors)
- Tests: 5 pass, 3 pre-existing failures (unchanged — auth mock + OpenCode mock needed)

## Build Sanity
- Bun 1.3.14, Elysia 1.4.28, Next.js 16.2.9
- Supabase migration idempotent (CREATE TABLE IF NOT EXISTS)
