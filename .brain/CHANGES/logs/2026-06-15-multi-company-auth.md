# Multi-Company Authorization — Implementation

## Date: 2026-06-15

## Files Created
- `backend/supabase/migrations/002_create_companies.sql` — companies, company_members, company_invitations tables, user_roles alter, product company_id, legacy migration
- `backend/src/config/companyGuards.ts` — getUserCompanies, checkCompanyAdmin, checkCompanyMember, checkAnyCompanyAdmin, checkAnyCompanyMember
- `backend/src/middlewares/companyAuth.ts` — requireCompanyAdmin, requireCompanyMember, requireSameCompany, requireCompanyAdminOf guards
- `backend/src/routes/admin.ts` — POST/GET/DELETE admin company endpoints
- `backend/src/routes/companies.ts` — company members, invitations, remove member
- `backend/src/routes/invitations.ts` — invitation view/accept with rate limiting
- `frontend/src/app/admin/companies/page.tsx` — company list and create
- `frontend/src/app/admin/companies/[id]/page.tsx` — company detail and member management
- `frontend/src/app/invitations/page.tsx` — invitation accept page

## Files Modified
- `backend/src/middlewares/auth.ts` — authDerive extended with companies, re-exports companyAuth guards
- `backend/src/routes/auth.ts` — /api/auth/me returns companies array with name, slug, role
- `backend/src/routes/product.ts` — split guard groups, company_id auto-assign, PUT/DELETE with ownership checks, fixed requireCompany→requireAnyAuth
- `backend/src/routes/index.ts` — registered new route files
- `frontend/src/contexts/AuthContext.tsx` — companies state, helpers, refreshCompanies
- `frontend/src/app/dashboard/page.tsx` — Companies tab with members and invites
- `frontend/src/app/products/page.tsx` — company badges, filter, edit/delete controls
- `frontend/src/proxy.ts` — extended matcher, public invitations path

## Discrepancies Found & Fixed
1. `requireCompany()` guard checked for obsolete 'company' role. Post-migration this role doesn't exist, blocking all non-admin users. Fixed by using `requireAnyAuth()` for GET /api/manuals.

## Build Status
- Backend: Compiles and starts successfully on port 8000
- Frontend: Compiles successfully (Next.js 16.2.9)

## Remaining
- RLS policies (planned follow-up)
- Run migration 002 in Supabase Dashboard
- End-to-end testing
