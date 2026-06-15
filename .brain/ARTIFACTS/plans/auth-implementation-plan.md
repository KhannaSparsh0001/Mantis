# Auth Implementation Plan

## Overview
Three-role authentication via Supabase SSR: Admin (Google OAuth), Company (Google OAuth), User (Email/Password).

## Prerequisites & Edge Cases

### Supabase OAuth Configuration
- Google OAuth must be enabled in Supabase Dashboard (Authentication > Providers > Google) before the callback route will function
- Redirect URL in Supabase Dashboard must include `http://localhost:3000/auth/callback` for local development, plus production URL
- The Supabase project referenced in `.env` is already provisioned; keys are set

### Next.js 16 Breaking Changes
- This project uses Next.js 16.2.9, which has intentional breaking changes from earlier versions
- Before writing middleware, route handlers, or any App Router feature, check the guide in `node_modules/next/dist/docs/` for API changes
- Specifically verify: middleware matcher config format, edge runtime available globals, cookie API in route handlers, and `redirect()` behavior from middleware
- The `@supabase/ssr` package's `updateSession()` pattern must be confirmed to work with Next.js 16's edge runtime before implementing the middleware

### Bun Runtime Compatibility
- Backend runs on Bun, not Node.js — Bun has its own `fetch` implementation
- `@supabase/supabase-js` uses `fetch` internally for `supabase.auth.getUser()` — verify this works with Bun's native fetch
- If `getUser()` fails on Bun, the fallback is to use a direct JWT decode with `SUPABASE_JWT_SECRET` via `jose` or similar library (confirmed to work on Bun)
- Bun's `process.env` auto-loads `.env` without a `dotenv` dependency; this is already confirmed working

### Database Trigger Constraint
- The `user_roles` migration creates a trigger on `auth.users` INSERT — this is allowed in Supabase but the trigger function must be created in the `public` schema (not `auth` schema)
- Trigger function needs `SECURITY DEFINER` to access `auth.users` from the `public` schema
- Alternative if trigger approach fails: use a Supabase Auth Hook (Auth > Hooks in Dashboard) on user creation event
- Migration must be run directly in Supabase Dashboard SQL editor (no `supabase` CLI installed in this project)

### Middleware Cookie Size
- Supabase SSR stores the session in cookies; the access token + refresh token + user metadata can exceed 4KB in the edge runtime
- If middleware crashes with a cookie size error, strip user metadata from the session cookie via `@supabase/ssr` cookie options
- Test with a realistic user object (including Google profile metadata) early

### Race Condition: Token Expiry Between Client and Backend
- When the frontend calls a protected backend API, the access token could expire between fetch and verification
- Backend middleware must handle 401 from `getUser()` gracefully by returning 401 to the frontend
- Frontend should retry API calls that receive 401 once after calling `getAccessToken()` (which refreshes if needed)
- Without this retry, users with long-running dashboard sessions will see random auth failures

## Execution Order

### Phase 0: Foundation
1. **Environment Variables**
   - Frontend `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Backend `.env`: already has `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`; verify they match the frontend project
   - Bun auto-loads `.env`; no dotenv needed

2. **Frontend Dependencies**
   - Install `@supabase/ssr` and `@supabase/supabase-js` via Bun in `frontend/`
   - **Critical**: Pin `@supabase/ssr` to a version confirmed compatible with Next.js 16 (check peer dependencies before install)

3. **User Roles Migration**
   - Create `backend/supabase/migrations/001_create_user_roles.sql`
   - Table: `user_roles` with `user_id` (uuid, FK to `auth.users`), `role` (text: 'admin'|'company'|'user'), `created_at`, unique constraint on `user_id`
   - Trigger on `auth.users` INSERT: create a `public` schema trigger function with SECURITY DEFINER that inserts into `user_roles` with default 'user' role
   - Deliver: run via Supabase Dashboard SQL editor (no CLI available)

4. **Email Whitelist Config**
   - Env var `AUTH_EMAIL_WHITELIST` with format `email1:admin,email2:company` (parsed by backend)
   - On first Google OAuth login, check whitelist before assigning Admin/Company role
   - Fall back to 'user' role if email not whitelisted

### Phase 1: Backend Track (parallel with Phase 2)

5. **Backend Role Utilities**
   - Create `backend/src/config/userRoles.ts`
   - Functions: `getUserRole(supabaseAdmin, userId)`, `assignUserRole(supabaseAdmin, userId, role)`, `checkEmailWhitelist(email)`
   - Accept Supabase admin client as injected parameter (testability)
   - On role miss for a verified user, check email whitelist and assign; if not whitelisted, assign 'user'

6. **Backend Auth Middleware**
   - Create `backend/src/middlewares/auth.ts`
   - Extract Bearer token from `Authorization` header; reject with 400 if malformed
   - Verify via `supabase.auth.getUser(token)`; if network error, return 503; if token invalid, return 401
   - Fetch role from `user_roles` table; if role missing, attempt auto-assignment from whitelist
   - Attach `{ user, role }` to Elysia request store
   - Guard exports: `requireAdmin()`, `requireCompany()`, `requireAnyAuth()`
   - Optional auth guard: attach user context if token present, but do not reject unauthenticated requests

7. **Backend Route Protection**
   - Modify `backend/src/routes/product.ts`
   - Apply `requireCompany()` guard to POST `/api/upload-manual`
   - Apply `requireCompany()` guard to GET `/api/manuals`
   - Keep `/api/diagnose` and `/api/ask` as optional auth (enrich with user context if available)

### Phase 2: Frontend Track (parallel with Phase 1)

8. **Supabase Browser Client**
   - Create `frontend/src/utils/supabase/client.ts`
   - Initialize with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Pure factory, no business logic

9. **Supabase Server Client**
   - Create `frontend/src/utils/supabase/server.ts`
   - Use `@supabase/ssr` `createServerClient` with cookie-based session (Next.js 16 cookies API)

10. **Supabase Middleware Client**
    - Create `frontend/src/utils/supabase/middleware.ts`
    - Use `@supabase/ssr` `createServerClient` with request/response cookie handling
    - Export `updateSession()` helper for middleware

11. **Next.js Middleware**
    - Create `frontend/src/middleware.ts` with a matcher scoped to `/dashboard/:path*` and `/admin/:path*`
    - Call `updateSession()` to refresh session cookies on matched routes
    - `/dashboard/*`: if no session, redirect to `/login`; store intended URL in cookie for post-login redirect
    - `/admin/*`: if no session, redirect to `/login`; if session exists but role is not 'admin', redirect to `/` (403 not possible at HTTP middleware level)
    - All other routes: pass through without session check

12. **Auth Callback Route**
    - Create `frontend/src/app/auth/callback/route.ts`
    - Handle OAuth redirect: extract `code` and `state` params
    - Validate state param against session cookie before exchanging code
    - Exchange code for session via Supabase server client
    - On success: set session cookies, redirect to saved intended URL or `/dashboard`
    - On error (invalid code, denied consent, state mismatch): redirect to `/login?error=<type>` with user-facing message
    - Standalone route handler — no AuthProvider dependency

13. **Auth Context and Provider**
    - Create `frontend/src/contexts/AuthContext.tsx` (exports both context and AuthProvider component)
    - Subscribe to `supabase.auth.onAuthStateChange` for session sync across tabs
    - `isLoading`: true during initial session check (prevent flash of unauthenticated state)
    - `signOut()`: calls `supabase.auth.signOut()`, clears client state, redirects to `/`
    - `getAccessToken()`: returns current access token from session for API calls
    - Provides: `user`, `session`, `role`, `isLoading`, `signInWithGoogle()`, `signInWithEmail()`, `signUp()`, `signOut()`, `getAccessToken()`

14. **Wrap Root Layout**
    - Modify `frontend/src/app/layout.tsx` to wrap children with AuthProvider

### Phase 3: Frontend Integration

15. **Login Page**
    - Create `frontend/src/app/login/page.tsx`
    - Google OAuth sign-in button (Admin/Company)
    - Email/password form (User)
    - Toggle between sign-in and sign-up modes
    - Error display: field validation for empty/invalid input; server errors (wrong password, user not found, email taken) mapped to user-facing messages
    - If user is already authenticated, redirect to `/dashboard`
    - OAuth button calls `signInWithGoogle()` with `redirectTo` pointing to auth callback

16. **Auth-Aware Navbar**
    - Modify `frontend/src/components/Navbar.tsx`
    - Unauthenticated: show Login link
    - Authenticated + role known: show user avatar/name/email, logout button; conditionally show Dashboard link for auth users, hide for anonymous
    - While loading (role unknown): render a neutral placeholder that does not flicker between logged-out and logged-in states

17. **Dashboard Protection**
    - Modify `frontend/src/app/dashboard/page.tsx`
    - On mount, check auth state: if not authenticated, show loading then redirect to `/login`
    - Upload interface visible only for Admin/Company roles
    - User role sees messaging indicating limited access; upload controls are hidden, not disabled

### Phase 4: API Integration

18. **Frontend API Token Injection**
    - Ensure all protected backend API calls include `Authorization: Bearer <access_token>` header
    - Use `getAccessToken()` from AuthContext to retrieve current token
    - On 401 response, call `getAccessToken()` again (triggers silent refresh if needed) and retry once before failing

## Edge Cases & Deployment Risks

### Dependency Versions
- `@supabase/ssr` peer dependency may require a specific `@supabase/supabase-js` version range — pin both together
- After installing, run `bun run dev` in frontend and backend separately to verify no import errors before writing implementation code

### OAuth Redirect Loop
- If middleware redirects to `/login`, and `/login` also triggers middleware (because it matches a matcher pattern), this creates a redirect loop
- **Mitigation**: middleware matcher must NOT include `/login`; the login page is public
- Verify: middleware matcher should be `['/dashboard/:path*', '/admin/:path*']` — login, callback, and public routes excluded

### First Login Timing
- On first Google OAuth login, the callback route sets the session, but the user_roles row may not exist yet if the async trigger hasn't fired
- **Mitigation**: the role utility in the backend and the AuthProvider in the frontend must handle `null` role gracefully — treat as 'user' default
- The role assignment trigger fires synchronously within the same transaction on `auth.users` INSERT, so this should be fine for new users
- For existing `auth.users` missing a `user_roles` row: the role utility calls `assignUserRole` on first role check miss

### Middleware Not Running
- If the middleware matcher pattern is wrong, middleware silently does not execute for those routes — the dashboard loads unprotected
- **Mitigation**: add a `console.log` or header set in middleware during development to verify it runs on matched routes
- Verify with: curl or browser devtools network tab showing middleware-calculated headers

### Supabase Project Key Mismatch
- The frontend uses anon key, the backend uses service_role key — these must belong to the same Supabase project
- If they don't match, the backend `getUser()` will return user data that doesn't match the frontend session's issuer
- **Verify**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in backend `.env` use the same project as `NEXT_PUBLIC_SUPABASE_URL` in frontend

### Google OAuth Without Redirect To
- If `signInWithGoogle()` is called without `redirectTo`, Supabase uses the default callback URL from Dashboard settings
- **Mitigation**: always pass `redirectTo: new URL('/auth/callback', window.location.origin).toString()` explicitly from the login page

## File Paths

### New Files (Frontend)
- `frontend/src/utils/supabase/client.ts`
- `frontend/src/utils/supabase/server.ts`
- `frontend/src/utils/supabase/middleware.ts`
- `frontend/src/middleware.ts`
- `frontend/src/app/login/page.tsx`
- `frontend/src/app/auth/callback/route.ts`
- `frontend/src/contexts/AuthContext.tsx`

### New Files (Backend)
- `backend/src/middlewares/auth.ts`
- `backend/src/config/userRoles.ts`

### New Files (Database)
- `backend/supabase/migrations/001_create_user_roles.sql`

### Modified Files (Frontend)
- `frontend/src/app/layout.tsx` — wrap with AuthProvider
- `frontend/src/components/Navbar.tsx` — auth-aware navigation
- `frontend/src/app/dashboard/page.tsx` — protected with role checks
- `frontend/package.json` — new dependencies
- `frontend/.env.local` — new env vars (create if not exists)

### Modified Files (Backend)
- `backend/src/routes/product.ts` — auth guards on endpoints
- `backend/.env` — add `AUTH_EMAIL_WHITELIST` for dev
- `backend/src/config/env.ts` — add `AUTH_EMAIL_WHITELIST`

## Dependency Graph

```
Phase 0
  Env Vars (no deps)
  Frontend Dependencies → needs Env Vars
  User Roles Migration (no deps)
  Email Whitelist Config → needs Env Vars

Phase 1 (Backend Track — depends on Phase 0)
  Backend Role Utilities → needs Migration, Email Whitelist Config
  Backend Auth Middleware → needs Role Utilities, Supabase Admin Client (already exists)
  Backend Route Protection → needs Auth Middleware

Phase 2 (Frontend Track — depends on Phase 0, parallel with Phase 1)
  Supabase Browser Client → needs Env Vars, Dependencies
  Supabase Server Client → needs Env Vars, Dependencies
  Supabase Middleware Client → needs Env Vars, Dependencies
  Next.js Middleware → needs Supabase Middleware Client
  Auth Callback Route → needs Supabase Server Client (standalone, no Auth context)
  Auth Context & Provider → needs Supabase Browser Client
  Wrap Root Layout → needs AuthProvider

Phase 3 (depends on Phase 2)
  Login Page → needs Auth Context, Auth Callback (as redirect target)
  Auth-Aware Navbar → needs Auth Context
  Dashboard Protection → needs Auth Context

Phase 4 (depends on Phase 1 + Phase 3)
  API Token Injection → needs Auth Context + Backend Auth Middleware
```

## Input/Output Contracts

### AuthProvider (frontend/src/contexts/AuthContext.tsx)
- Input: children
- Output: `{ user, session, role, isLoading, signInWithGoogle, signInWithEmail, signUp, signOut, getAccessToken }`
- Edge case: when `role` is null (pre-assignment), consumers treat as 'user' default

### Backend Auth Middleware (backend/src/middlewares/auth.ts)
- Input: request with `Authorization: Bearer <token>` header
- Output: request store with `{ user, role }`, or 400 (malformed header), 401 (invalid/expired token), 503 (Supabase unreachable), 403 (guard violation)
- Guards: `requireAdmin()`, `requireCompany()`, `requireAnyAuth()`

### Auth Callback (frontend/src/app/auth/callback/route.ts)
- Input: URL params `code` + `state` from Google OAuth redirect
- Processing: validate state → exchange code → check whitelist → assign role → set cookies → redirect
- Error outputs: `/login?error=<type>` where types are `access_denied`, `invalid_request`, `state_mismatch`, `auth_failed`
- Standalone route handler — no component wrapping

### Next.js Middleware (frontend/src/middleware.ts)
- Matcher: `['/dashboard/:path*', '/admin/:path*']`
- On matched routes: refresh session via `updateSession()`, then check auth/role, redirect if needed
- On unmatched routes: pass through entirely

## Verification Criteria

### Route Protection
- Unauthenticated user gets redirected to `/login` when accessing `/dashboard`
- Authenticated User role gets redirected from `/admin` (to `/`)
- Admin accesses all routes (dashboard, admin, public)
- Company accesses dashboard but not admin
- Public routes (home, products, diagnostics) serve without auth
- `/login` itself is public and does not trigger middleware redirects (no redirect loop)

### Authentication Flows
- Google OAuth flow completes: button → consent → callback → session set → redirected to intended URL
- Google OAuth whitelisted email → correct Admin/Company role on first login
- Google OAuth non-whitelisted email → 'user' role or access denied (per config)
- Email/password signup → 'user' role auto-assigned
- Email/password sign-in → session created correctly
- Sign-out → cookies cleared, redirected to `/`, protected routes blocked afterward
- Session persists across page refresh and browser restart

### Backend API Protection
- POST `/api/upload-manual` returns 401 without auth, 200 with Admin/Company auth
- GET `/api/manuals` returns 401 without auth, 200 with Admin/Company auth
- POST `/api/diagnose` and `/api/ask` work without auth
- User role attempting Company endpoint returns 403
- Malformed Authorization header returns 400
- Supabase network failure returns 503, not 500 or crash

### Error Handling
- Invalid OAuth code → redirected to `/login?error=invalid_request` with explanation
- User denies OAuth consent → redirected to `/login?error=access_denied` with explanation
- Login page shows inline errors for: empty fields, wrong password, user not found, email already taken
- Loading state visible during initial auth check — no flash of logged-out state
- Expired session on protected route → redirected to `/login`

### Data Integrity
- Role assignment is idempotent: repeated login does not create duplicate `user_roles` rows
- Trigger fires on `auth.users` INSERT for automatic 'user' role assignment
- First-time Google OAuth login with whitelisted email assigns correct role
- Null role in AuthProvider is handled as 'user' default
