# Mantis

## Project Identity
- **Name:** Mantis
- **Description:** AI-powered support portal for product manuals and diagnostics
- **Root:** /home/fev/GitRepos/Mantis

## Current Phase
- Execution — Persistent Diagnostic Conversations

## Technology Stack
- **Frontend:** Next.js 16.2.9 (App Router, TypeScript, React 19)
- **Styling:** Tailwind CSS v4.3, custom Mantis Light-Green theme
- **Backend:** Elysia 1.4.28 (Bun runtime)
- **Persistence:** Supabase (Postgres) + Moss (semantic search)
- **AI:** OpenCode (mimo-v2.5-free)
- **Auth:** Supabase SSR (Google OAuth + Email/Password)
- **Runtime:** Bun v1.3.14

## Architecture
- Backend (Elysia) on `localhost:8000`
- Frontend (Next.js) on `localhost:3000`
- Moss for real-time semantic search on uploaded product manuals
- OpenCode for AI-powered diagnostic responses
- Supabase Auth for Google OAuth (Admin) + Email/Password (User)

## Active Objective
Replace hardcoded demo conversations on /diagnostics with user-owned, Supabase-backed persistent conversations that survive page refresh.

## Active Milestone
5 tasks (0-5) executed and verified for persistent conversations.

## Active Plans
- `.brain/ARTIFACTS/plans/persistent-conversations-plan.md`

## Completed Work
- **MOSS Optimization (7 tasks):** Created typed wrappers + chunker, refactored client for shared index + hybrid search + cache, updated upload/diagnose/ask endpoints, removed dead code, verified compilation
- **Product Page Polish:** Added PUT /api/products/:id endpoint for inline editing, delete-with-confirmation on Dashboard and /products pages
- **README:** 326-line comprehensive rewrite with architecture diagram, from-scratch setup, API reference, MOSS deep-dive, design system
- **MOSS Cloud Cleanup:** Residual per-product indexes removed via portal

## Next Steps
- Complete persistent conversations (Tasks 0-5 of active plan)
- Fix pre-existing test failures (3 tests need OpenCode mock + auth mock)
