# Multi-Company Authorization Design

## Problem
Current auth has a flat "company" role with no way to distinguish between different companies or isolate their data.

## Approach: Separate `company_members` table (Approach 1)

### Data Model

**`companies`** — created only by super admin
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | auto-generated |
| name | TEXT | required |
| slug | TEXT UNIQUE | url-friendly identifier |
| created_at | TIMESTAMPTZ | auto |
| created_by | UUID | FK to auth.users (admin who created it) |

**`company_members`** — links users to companies with per-company role
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | auto-generated |
| user_id | UUID FK | references auth.users |
| company_id | UUID FK | references companies |
| role | TEXT | 'admin' or 'member' |
| created_at | TIMESTAMPTZ | auto |
| UNIQUE(user_id, company_id) | | one membership per company |

**`company_invitations`** — email-based invites
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | auto-generated |
| company_id | UUID FK | references companies |
| email | TEXT | invited person's email |
| role | TEXT | 'admin' or 'member' |
| invited_by | UUID FK | references auth.users |
| token | TEXT UNIQUE | auto-generated secure token |
| accepted | BOOLEAN | default FALSE |
| created_at | TIMESTAMPTZ | auto |
| expires_at | TIMESTAMPTZ | 7 days from creation |

**`user_roles`** — simplified (migration alters existing)
| Column | Type | Notes |
|---|---|---|
| user_id | UUID PK | FK to auth.users |
| role | TEXT | 'admin' or 'user' (dropped 'company') |
| created_at | TIMESTAMPTZ | auto |

**`products`** — add company_id column
| Current Columns | + company_id UUID FK references companies |

### Role Model

| Role | Scope | Can |
|---|---|---|
| admin | global | create companies, assign company admins, browse/edit all data |
| company_admin | per-company | invite members, edit own company's products/manuals |
| company_member | per-company | browse all products, edit own company's products/manuals |
| user | global | browse all products, no edit |

### Auth Middleware Updates

- `authDerive` returns `{ user, role, companies: [{ id, role }] }`
- `requireCompanyAdmin()` → user is global admin OR has company_admin role in at least one company
- `requireCompanyMember()` → user is global admin OR has any company membership
- `requireSameCompany(companyId)` → user's companies include companyId

### Backend API Endpoints

**Admin endpoints (require global admin):**
- `POST /api/admin/companies` — create company
- `GET /api/admin/companies` — list all companies
- `POST /api/admin/companies/:id/members` — assign company admin

**Company endpoints (require company_admin or admin):**
- `GET /api/companies/:id/members` — list members
- `POST /api/companies/:id/invitations` — invite by email
- `DELETE /api/companies/:id/members/:userId` — remove member

**Product endpoints (updated):**
- `GET /api/products` — browse all (anyone authenticated)
- `POST /api/products` — create (company member, auto-assigns company_id from user's membership)
- `PUT /api/products/:id` — update (only if user's company owns the product, or admin)
- `DELETE /api/products/:id` — delete (only if user's company owns the product, or admin)

**Invitation flow:**
- `GET /api/invitations?token=xxx` — view invitation info
- `POST /api/invitations/accept` — accept invitation (joins company)

### Frontend

- **Admin panel**: company CRUD, view all companies, assign company admins
- **Company dashboard**: manage members, view invitations, see company products
- **Product pages**: edit/delete buttons only visible for own company's products
- **Invitation page**: accept/decline invites

### Files to Create/Modify

**New files:**
- `backend/supabase/migrations/002_create_companies.sql`
- `backend/src/routes/admin.ts` — admin company management endpoints
- `backend/src/routes/companies.ts` — company member/invite endpoints
- `backend/src/routes/invitations.ts` — invitation accept flow
- `frontend/src/app/admin/companies/page.tsx` — company management UI
- `frontend/src/app/admin/companies/[id]/page.tsx` — company detail/members
- `frontend/src/app/invitations/page.tsx` — accept invitation page

**Modified files:**
- `backend/src/config/userRoles.ts` — new guards (requireCompanyAdmin, requireCompanyMember)
- `backend/src/middlewares/auth.ts` — extend derive with company info
- `backend/src/routes/product.ts` — add company_id checks to mutations
- `backend/src/routes/index.ts` — register new routes
- `backend/src/routes/auth.ts` — return company info in /me
- `frontend/src/contexts/AuthContext.tsx` — add companies to context
- `frontend/src/proxy.ts` — company-aware route protection

### Dependency Graph

```
migrations/002 (schema)
    ↓
userRoles.ts (new guards)
    ↓
auth.ts middleware (extend derive)
    ↓
routes/admin.ts  routes/companies.ts  routes/invitations.ts  routes/product.ts (update)
    ↓
frontend pages (admin, companies, invitations, product)
```

### Verification Criteria

1. Admin can create a company and assign a company admin
2. Company admin can invite members via email
3. Invited user accepts invitation and gains company membership
4. Company member can create a product (auto-assigned to their company)
5. Company member can edit their own product
6. Company member CANNOT edit another company's product
7. User without company can browse products but cannot create/edit
8. Admin can edit/delete any product
