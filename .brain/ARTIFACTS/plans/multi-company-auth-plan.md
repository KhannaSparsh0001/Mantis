# Multi-Company Authorization Plan (Pass 3: Immediate-Phase Edge Cases)

## Objective
Replace the flat "company" role with proper multi-company support: companies table, company_members, email invitations, and company-level data isolation on products.

## Existing Schema Audit
- `migrations/001_create_user_roles.sql` has `CHECK (role IN ('admin', 'company', 'user'))` — must be altered to `CHECK (role IN ('admin', 'user'))`. In-flight inserts during migration window are safe because the trigger runs on auth.users INSERT.
- Existing users with role 'company' must be handled during migration (no data loss).
- `backend/src/middlewares/auth.ts` already exports `requireCompany` guard — will extend not replace.
- `backend/src/routes/index.ts` registers routes via `app.use()` — new route files need registration here.
- `frontend/src/proxy.ts` currently protects `/dashboard/:path*` and `/admin/:path*`.
- The slug `"legacy"` must be reserved — no user-created company may use it.
- **Critical: Guard group scope in `product.ts`** — The existing `requireCompany()` guard wraps BOTH `GET /api/manuals` AND `POST /api/upload-manual` in a single Elysia `.guard()` group. Changing the group guard affects both routes. Must split into separate guard groups if their auth requirements diverge.
- **Critical: PUT /api/products/:id and DELETE /api/products/:id do not exist** — These are NEW routes to be created in `product.ts`, not modifications of existing ones. The "Update Product Routes" task is adding brand-new endpoints.
- **Critical: authDerive cache shape is `{ id, role }` but /me endpoint needs `{ id, name, slug, role }`** — The cache does not store display fields. /me must perform its own JOIN to the companies table. Task 9 must NOT claim it can use the cache directly.

## Task Breakdown

### Task 1: Database Migration — Create Tables
**Files:** `backend/supabase/migrations/002_create_companies.sql`
**Depends on:** nothing
**Actions:**
- Create `companies` table (id UUID PK, name TEXT, slug TEXT UNIQUE, created_at TIMESTAMPTZ, created_by UUID FK to auth.users). Index on slug — covered by UNIQUE.
- Create `company_members` table (id UUID PK, user_id UUID FK, company_id UUID FK, role TEXT CHECK ('admin' or 'member'), created_at TIMESTAMPTZ) with UNIQUE(user_id, company_id). The composite index on (user_id, company_id) covers user_id-only lookups via PostgreSQL prefix rule.
- Create `company_invitations` table (id UUID PK, company_id UUID FK, email TEXT, role TEXT, invited_by UUID FK, token TEXT UNIQUE, accepted BOOLEAN default FALSE, created_at TIMESTAMPTZ, expires_at TIMESTAMPTZ default NOW() + 7 days). Token column is TEXT (not UUID) to hold a 64-character hex string. Additional index on (company_id, email, accepted) for duplicate-invitation checks.
- Alter `user_roles` table: drop CHECK constraint, add new CHECK (role IN ('admin', 'user')).
- Add `company_id` column to `products` table (nullable UUID FK to companies, ON DELETE SET NULL).

### Task 1.5: Data Migration — Handle Existing 'company' Role Users
**Files:** `backend/supabase/migrations/002_create_companies.sql` (same file)
**Depends on:** Task 1
**Actions:**
- Migrate existing users with user_roles.role = 'company': insert them as company_members in a new catch-all company (name: "Legacy Users", slug: "legacy") created by the system (created_by = NULL), with role 'admin'.
- Update their user_roles.role to 'user'.
- Reserve the slug "legacy" — add a comment in the migration and validate in the route layer that user-created slugs cannot equal "legacy".

### Task 2: Backend — New Route Guards
**Files:** `backend/src/config/companyGuards.ts` (new file — separates company concerns from generic role helpers)
**Depends on:** Task 1.5
**Actions:**
- Add `getUserCompanies(userId)` — returns list of `{ companyId, role }` for a user (queries company_members on user_id index). Memoize result per-request on the Elysia `ctx` store so subsequent guards in the same request reuse the data (avoid N+1 on multi-guard endpoints).
- Add `checkCompanyAdmin(companyId, userId)` — boolean, is user a company admin in the given company. Must return false if userId is null/undefined (safe guard for unauthenticated routes).
- Add `checkCompanyMember(companyId, userId)` — boolean, is user a member of a specific company. Must return false if userId is null/undefined.
- Add `checkAnyCompanyAdmin(userId)` — boolean, is user a company admin in at least one company. Returns false for null userId.
- Add `checkAnyCompanyMember(userId)` — boolean, is user a member of at least one company. Returns false for null userId.

### Task 3: Backend — Extend Auth Middleware
**Files:** `backend/src/middlewares/auth.ts`, new file `backend/src/middlewares/companyAuth.ts`
**Depends on:** Task 2
**Actions:**
- Extract company-specific middleware into `companyAuth.ts` to prevent `auth.ts` from ballooning. `auth.ts` imports and re-exports these guards for backward compatibility.
- Extend `authDerive` to fetch user's companies (via `getUserCompanies`) and cache them on `ctx.store.companies`. Cached shape: `[{ id, role }]` — lean, no display fields. This is a per-request cache; it does NOT persist between requests.
- Add `requireCompanyAdmin()` guard — user is global admin OR `checkAnyCompanyAdmin(userId)` returns true. Returns 401 if no user, 403 if check fails.
- Add `requireCompanyMember()` guard — user is global admin OR `checkAnyCompanyMember(userId)` returns true. Returns 401 if no user, 403 if check fails.
- Add `requireSameCompany(companyId)` guard — if companyId is null/undefined, return 403 (only global admin can act on unassociated records). If companyId is set: user is global admin OR user's companies include companyId. Returns 401 if no user, 403 if check fails.
- Add `requireCompanyAdminOf(companyId)` guard — if companyId is null/undefined, return 403. If set: global admin OR `checkCompanyAdmin(companyId, userId)` is true. Returns 401 if no user, 403 if check fails.
- Do NOT modify the existing `requireCompany()` guard — it still requires any authenticated session for basic product routes.
- Integration note: `authDerive` runs before route guards in the middleware chain. All company guards assume the user object exists on `ctx`. Routes that use company guards without first authenticating will crash with a null reference on `ctx.user`. Every company-guarded route must either: (a) use a preceding `requireAuth()` middleware, or (b) have company guards that internally return 401 when user is missing.

### Task 4: Backend — Admin Company Endpoints
**Files:** `backend/src/routes/admin.ts` (new file)
**Depends on:** Task 3
**Actions:**
- `POST /api/admin/companies` — create company (body: name, slug), auto-inserts creator as company_admin in company_members. Validate slug != "legacy" (reserved). Validate slug is non-empty and URL-safe (alphanumeric + hyphens only).
- `GET /api/admin/companies` — list all companies with member counts (LEFT JOIN company_members). Paginate with `limit` and `offset` query params (default limit 50, max 200).
- `POST /api/admin/companies/:id/members` — assign a user as company admin (body: userId). Check user has no existing membership before insert — UNIQUE constraint is a backup, not the primary check.
- `DELETE /api/admin/companies/:id` — reject with 409 if company has products (include count in response body). Requires explicit confirmation in the request body (`{ confirm: true }`). Batch-deletes company_members in a single DELETE statement (not row-by-row).
- All routes guarded by `requireAdmin`.

### Task 5: Backend — Company Management Endpoints
**Files:** `backend/src/routes/companies.ts` (new file)
**Depends on:** Task 3
**Actions:**
- `GET /api/companies/mine` — get current user's companies with member counts. Uses the request-scoped cache for membership data, then JOINs companies table for display names. Returns empty array (not 404) for users with no companies.
- `GET /api/companies/:id/members` — list members. Guard: `requireCompanyAdminOf(companyId)` (admin of this company OR global admin).
- `POST /api/companies/:id/invitations` — create invitation (body: email, role). Guard: `requireCompanyAdminOf(companyId)`. Token: 32 bytes from CSPRNG, hex-encoded (64-char string, fits in TEXT column). If a pending unaccepted invitation already exists for this email + company, silently skip insert and return generic 200 (prevents enumeration). If the email belongs to an existing member, same generic 200. The email-send stub logs the token for development; production email integration is deferred.
- `DELETE /api/companies/:id/members/:userId` — remove member. Guard: `requireCompanyAdminOf(companyId)`. Block removal if target user is the last company_admin in the company (return 409 with message "Cannot remove the last company admin; promote another member first"). Cannot remove self (checked separately). **Race condition guard**: last-admin check and delete must happen in a single atomic operation (transaction or row-level locking) — two concurrent DELETE requests could both pass the "not last admin" check before either executes, resulting in zero admins.
- Role selector accepts 'admin' or 'member'. Company admin may invite other company_admins — intentional trust delegation pattern.

### Task 6: Backend — Invitation Flow
**Files:** `backend/src/routes/invitations.ts` (new file)
**Depends on:** Task 1
**Actions:**
- `POST /api/invitations/view` — view invitation by token (body: `{ token }`, NOT query param). Using POST body prevents token leakage through server logs, browser history, and Referer headers. Rate limit: 5 attempts per minute per IP + 5 attempts per minute per token (two-tier to prevent per-token brute force behind shared NAT).
- `POST /api/invitations/accept` — accept invitation (body: token). Validates:
  1. Token exists — 404 if unknown.
  2. Token not expired (expires_at > NOW()) — 404 (same as unknown to avoid revealing token validity).
  3. Token not already accepted — 409 with message "Invitation already accepted."
  4. Authenticated user's email matches invitation.email — 403 if mismatch (prevents accepting an invitation sent to a different email).
  5. User is not already a member of this company (check company_members before insert) — 409 with message "Already a member of this company." The UNIQUE constraint on (user_id, company_id) is a backup, not the primary check — explicit check gives a clean error message instead of a Postgres constraint violation.
  If all checks pass: INSERT into company_members, UPDATE invitations SET accepted = TRUE, in a single transaction.
- No auth guard on the endpoint itself (uses token as credential), but the accept handler reads the authenticated user from the session. If no session, return 401 with message "Must be logged in to accept an invitation."

### Task 7: Backend — Product Routes (Add + Update)
**Files:** `backend/src/routes/product.ts`
**Depends on:** Task 3
**Actions:**
- **CRITICAL: Split guard groups.** The existing `requireCompany()` guard wraps both `GET /api/manuals` and `POST /api/upload-manual` in the same Elysia `.guard()` block. These routes must be split into separate guard groups:
  - Group A (`requireCompany()` — any authenticated user): `GET /api/manuals` — unchanged.
  - Group B (`requireCompanyMember()` OR `requireAdmin`): `POST /api/upload-manual` — company membership required.
- `POST /api/upload-manual` — auto-assign `company_id` from the user's earliest company membership (ordered by created_at ASC for determinism). If user is global admin with no company, set NULL. If user has no company and is not admin, 403.
- **CREATE** `PUT /api/products/:id` — new endpoint. Guard: fetch product, check `product.company_id`. If NULL, only admin may edit (403 for non-admin). If non-NULL, `requireSameCompany(product.company_id)`.
- **CREATE** `DELETE /api/products/:id` — new endpoint. Same guard logic as PUT — NULL company_id means admin-only, non-NULL requires same company.
- `GET /api/products` — return all products (any authenticated user). No change.
- `POST /api/products` — does not exist in current codebase; not in scope for this plan.
- Note: The company_id check is a thin guard injected into each handler. Do not deeply embed company logic into the upload/manual processing pipeline.

### Task 8: Backend — Register New Routes
**Files:** `backend/src/routes/index.ts`
**Depends on:** Tasks 4, 5, 6
**Actions:**
- Import and register `adminRoutes`, `companyRoutes`, and `invitationRoutes` via `app.use()`.
- Order: auth routes -> invitation routes -> company routes -> admin routes -> product routes. Auth middleware must be initialized before any company-guarded routes.

### Task 9: Backend — Update Auth /me Endpoint
**Files:** `backend/src/routes/auth.ts`
**Depends on:** Task 2
**Actions:**
- Extend `GET /api/auth/me` response to include `companies` array as `{ id, name, slug, role }`.
- **CRITICAL: The authDerive cache only stores `{ id, role }` (lean shape).** The /me endpoint must perform its own JOIN from `company_members` + `companies` to get `name` and `slug`. Do NOT attempt to pull display fields from the request-scoped cache.
- This is the primary endpoint frontend uses to hydrate company state.

### Task 10: Frontend — AuthContext Update
**Files:** `frontend/src/contexts/AuthContext.tsx`
**Depends on:** Task 9
**Actions:**
- Add `companies` state (array of `{ id, name, slug, role }`).
- Fetch companies from `/api/auth/me` response.
- Expose `companies` and helpers: `getCompanyRole(companyId): string | null`, `isCompanyAdmin(companyId): boolean`, `getCompanyName(companyId): string | null`.
- Add a `refreshCompanies()` method that re-fetches `/api/auth/me` and updates the companies array. The proxy middleware (Task 15) calls this when a company-scoped API returns 403, preventing stale session state after role changes.

### Task 11: Frontend — Admin Company Management UI
**Files:**
- `frontend/src/app/admin/companies/page.tsx` — list all companies, create company form.
- `frontend/src/app/admin/companies/[id]/page.tsx` — view members, assign company admin, delete company.
**Depends on:** Task 4
**Actions:**
- Paginated table of all companies with name, slug, member count, created date; create button opens modal.
- Company detail page showing members table with role badges, add/remove controls.
- Confirmation dialog on delete — shows product count if any, requires explicit checkbox confirmation.
- Slug input validates "legacy" as reserved and checks URL-safe format client-side before submission.

### Task 12: Frontend — Company Dashboard
**Files:** `frontend/src/app/dashboard/page.tsx` (update existing)
**Depends on:** Task 10, Task 5
**Actions:**
- Show user's companies as cards/sections. If companies array is empty, show "You are not a member of any company" state with a link to the admin panel.
- For each company: member list with role badges, invitation management, product count.
- Invite form: email input, role selector ('admin' or 'member'), send button. Generic success message regardless of result (prevents user enumeration).
- Only show invite/member controls if user is company_admin in that company.
- After a successful invitation send or member removal, auto-refresh the members list.

### Task 13: Frontend — Invitation Page
**Files:** `frontend/src/app/invitations/page.tsx` (new)
**Depends on:** Task 6
**Actions:**
- Read token from URL query param and immediately POST it to `/api/invitations/view` (never expose the token in a GET request URL).
- Show company name, inviter email, expiration date, status (accepted/expired/pending).
- Accept button — calls `POST /api/invitations/accept`. Handles 409 (already accepted or already member) and 404 (expired/invalid) responses gracefully with user-friendly messages.
- After accept, redirect to dashboard with "Successfully joined {company name}" toast.
- If the user is NOT logged in, redirect to login page with the invitation URL as the redirect target.
- Page sets `<meta name="referrer" content="no-referrer">` to prevent token leakage via Referer header.

### Task 14: Frontend — Product UI Company Awareness
**Files:** `frontend/src/app/products/page.tsx` (update existing)
**Depends on:** Task 10
**Actions:**
- Show company name/badge on each product card. For products with NULL company_id, show "Unassociated" tag.
- Only show edit/delete controls for own company's products (admin sees all).
- Add filter dropdown to filter products by company.
- After any 403 response from a product mutation, refresh the companies context to pick up role changes.

### Task 15: Frontend — Proxy Route Protection Updates
**Files:** `frontend/src/proxy.ts`
**Depends on:** Task 10
**Actions:**
- Extend proxy middleware to check company membership for routes under `/companies/:id/*`.
- Redirect non-members to 403 page or dashboard.
- Ensure `/invitations` path is accessible without authentication (redirect to login with redirect back if not logged in).
- Ensure `/admin/companies` paths still require authentication.
- Update config.matcher to include `/companies/:path*` and `/invitations/:path*` routes.
- When a proxied API request returns 403 for a company-scoped endpoint, trigger `refreshCompanies()` on the next page load.

## Dependency Graph
```
Task 1 (DB migration — create tables)
  └─ Task 1.5 (DB migration — handle legacy 'company' role)
       └─ Task 2 (route guards — companyGuards.ts)
            ├─ Task 3 (auth middleware — auth.ts + companyAuth.ts)
            │    ├─ Task 4 (admin company endpoints — admin.ts)
            │    ├─ Task 5 (company mgmt endpoints — companies.ts)
            │    └─ Task 7 (add/update product routes — product.ts)
            └─ Task 9 (auth/me update — auth.ts)
                 └─ Task 10 (frontend AuthContext)
                      ├─ Task 11 (admin company UI)
                      ├─ Task 12 (company dashboard)
                      ├─ Task 14 (product UI company awareness)
                      └─ Task 15 (frontend proxy updates)

Task 1 (DB migration)
  └─ Task 6 (invitation endpoints — invitations.ts) — no auth guards needed, uses token

Task 4 + Task 5 + Task 6 (all route files exist)
  └─ Task 8 (register new routes in index.ts)

Task 10 + Task 6
  └─ Task 13 (invitation page — needs API routes + auth context)
```

## Execution Order
Phase 1 — Database: Tasks 1, 1.5
Phase 2 — Backend Guards: Tasks 2, 3
Phase 3 — Backend Routes: Tasks 4, 5, 6, 7 (parallel-safe within Phase 3), then Task 8
Phase 4 — Backend API: Task 9
Phase 5 — Frontend: Tasks 10, 11, 12, 13, 14, 15 (Task 10 must be first)

## Immediate-Phase Edge Cases (Pass 3 — Runtime-Blocking Only)

### Integration Mismatches

1. **authDerive cache vs /me response shape** — Task 3 caches `{ id, role }` (lean, no JOIN). Task 9 needs `{ id, name, slug, role }`. Cache cannot serve display fields. /me must JOIN companies table independently. The plan now reflects this in Task 9.

2. **Guard group scope in product.ts** — The existing `requireCompany()` guard wraps BOTH `GET /api/manuals` and `POST /api/upload-manual`. If Task 7 upgrades the guard to `requireCompanyMember()`, the GET route breaks for non-member authenticated users. Fix: split into separate guard groups (now explicit in Task 7).

3. **Token column type vs generated format** — `token TEXT UNIQUE` receives a 64-char hex string (32 CSPRNG bytes). TEXT is correct. Implementers must NOT use UUID type for the token column. Clarified in Task 1 and Task 5.

### Runtime Crashes

4. **NULL company_id in product guards** — `PUT /api/products/:id` and `DELETE /api/products/:id` must handle `product.company_id === NULL`. Only global admin may mutate unassociated products. `requireSameCompany(null)` returns 403. Now explicit in Task 3 guard definition.

5. **Company guard called without authenticated user** — All company guards (`requireCompanyAdmin`, `requireCompanyMember`, `requireSameCompany`, `requireCompanyAdminOf`) must return 401 when `ctx.user` is null/undefined. Every route using these guards must either have a preceding auth middleware or handle the null case internally. Now explicit in Task 3.

6. **getUserCompanies called with null userId** — Guard functions in Task 2 must return false for null/undefined userId instead of crashing on a database query. Now explicit in Task 2.

### State Transitions

7. **User accepts invitation but is already a member** — POST /api/invitations/accept must check company_members for existing (user_id, company_id) before inserting, returning a clean 409 instead of a Postgres constraint violation error. Now explicit in Task 6.

8. **Email mismatch on invitation accept** — The authenticated user's email must match the invitation's email field. POST /api/invitations/accept returns 403 on mismatch. This prevents accepting an invitation sent to a different email address. Now explicit in Task 6.

9. **Deterministic "first company" for product association** — POST /api/upload-manual must order company memberships by `created_at ASC` and pick the first. Without explicit ordering, the result is database-dependent. Now explicit in Task 7.

10. **Race condition on last-admin removal** — Two concurrent DELETE /api/companies/:id/members/:userId requests could both pass the "not last admin" check before either executes, resulting in zero company admins. The check and delete must be atomic (single transaction or row-level locking). Now explicit in Task 5.

### Auth Context Staleness

11. **User removed from company during active frontend session** — After any 403 from a company-scoped API call, AuthContext should refresh its companies data via `refreshCompanies()`. This picks up role changes (demotion from admin, removal from company) on the next relevant action. Now explicit in Task 10 and Task 15.

12. **Invitation page accessed while not logged in** — Redirect to login with the invitation URL preserved as the redirect parameter. After login, the user lands back on the invitation page. Now explicit in Task 13.

### Rate Limiting

13. **NAT environments for rate limiting** — Users behind shared office NAT share an IP. The invitation view endpoint adds a per-token rate limit (5/min per token) alongside the per-IP limit (5/min) so a shared office cannot brute-force a specific token. Now explicit in Task 6.

## Edge Cases & Error Handling (Retained from Prior Passes)

14. **Invitation token exposure** — Tokens travel in POST bodies only, never in URLs. Invitation page sets `no-referrer`.
15. **User enumeration via invitation** — POST /api/companies/:id/invitations returns generic 200 for all outcomes.
16. **Expired invitation** — POST /api/invitations/accept returns 404 (same as invalid token, no oracle).
17. **Reserved slug** — "legacy" is blocked at the route layer.
18. **Company with products on delete** — Rejected with 409 and product count.
19. **Slug collision** — Returns 409.
20. **First-time user with no companies** — /api/companies/mine and /api/auth/me return empty arrays.
21. **Product creation without company** — Admin: NULL company_id. Non-admin: 403.
22. **Company_admin trust boundary** — Can invite other company_admins. Global admins audit via members list.

## Testing Strategy

### Test Layers
- **Unit tests** (`backend/src/__tests__/guards/companyGuards.test.ts`): Test each guard function in isolation with mocked Supabase client. Cover: user with no companies, user in one company, user in multiple companies, global admin bypass, null userId, null companyId.
- **Integration tests** (`backend/src/__tests__/routes/`): Test each endpoint against a test database with migrations applied. Separate files: `adminCompanies.test.ts`, `companyMembers.test.ts`, `invitations.test.ts`, `productAuth.test.ts`. Each file tests happy path, auth bypass, and permission escalation.
- **End-to-end**: Add Playwright tests for critical frontend flows: admin creates company, user accepts invitation, product editing permissions.

### Attack Scenarios to Test
- Unauthenticated POST to any guarded endpoint returns 401.
- User with no company calls company-admin-only endpoint returns 403.
- company_member calls company_admin endpoint (invite, remove member) returns 403.
- User A edits User B's product (different company) returns 403.
- Admin edits any company's product returns 200.
- POST /api/invitations/accept with tampered/invalid token returns 404.
- POST /api/invitations/accept with reused (already accepted) token returns 409.
- POST /api/invitations/accept with expired token returns 404.
- POST /api/invitations/accept with email mismatch returns 403.
- POST /api/companies/:id/invitations returns generic 200 for both existing and non-existing emails.
- DELETE /api/companies/:id/members/:userId with last admin target returns 409.
- Two concurrent DELETE /api/companies/:id/members/:userId requests — ensure exactly one succeeds when targeting the last admins.
- Rate limiter blocks 6th request within a minute on invitation endpoints.
- NULL company_id product: non-admin tries to edit — 403.
- GET /api/manuals remains accessible to any authenticated user (including non-company members) after guard group split.

### CI Integration
- Unit + integration tests run as a single `bun test` step before merge.
- Test database is created and migrated fresh per run (no state leakage).
- Frontend tests run in a separate step after backend tests pass.

## Verification Criteria
1. Admin creates a company via POST /api/admin/companies — auto-assigned as company_admin in company_members.
2. Admin assigns a user as company_admin via POST /api/admin/companies/:id/members.
3. Company admin invites a new member via POST /api/companies/:id/invitations.
4. Invited user accepts via POST /api/invitations/accept — company_members row created, invitation marked accepted.
5. Company member creates a product via POST /api/upload-manual — product tagged with their company_id.
6. Company member edits their own product via PUT /api/products/:id — 200.
7. Company member edits another company's product — 403.
8. Admin edits any product — 200.
9. Admin edits a product with NULL company_id — 200.
10. Non-admin edits a product with NULL company_id — 403.
11. User without company browses products — sees full list.
12. User without company creates product — 403.
13. Existing user with legacy 'company' role — migrated, still has company_admin access via Legacy Users company.
14. Expired/tampered invitation token — returns 404.
15. Reused (already accepted) invitation token — returns 409.
16. Invitation accept with email mismatch — returns 403.
17. User already a member accepts invitation to same company — returns 409.
18. Duplicate slug on company creation — returns 409.
19. Creating a company with slug "legacy" — returns 409.
20. Rate limit on invitation endpoints — 6th request in a minute returns 429.
21. Removing the last company_admin from a company — returns 409.
22. Two concurrent requests removing the last two admins — exactly one succeeds.
23. GET /api/admin/companies with limit=10 returns max 10 results.
24. GET /api/manuals returns results for any authenticated user (no company required).
