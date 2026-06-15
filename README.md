# Mantis — AI-Powered Support for Every Product You Own

Mantis is a full-stack AI diagnostics platform. Upload a product manual (PDF), and Mantis indexes it in real‑time for semantic search, then lets you diagnose problems through an AI chat assistant that references your specific product documentation.

## Architecture

```
┌──────────────┐       ┌──────────────┐       ┌───────────┐       ┌──────────────┐
│   Frontend   │──────▶│   Backend    │──────▶│  Supabase │       │    MOSS      │
│  Next.js 16  │◀──────│  Elysia/Bun  │◀──────│  (Postgres │       │  (Semantic   │
│  :3000       │  REST │  :8000       │  Auth  │  + Storage)│       │   Search)    │
└──────────────┘       └──────┬───────┘       └───────────┘       └──────┬───────┘
                              │                                          │
                              │◀──── OpenCode (AI Diagnostics) ─────────▶│
                              └──────────────────────────────────────────┘
                              │◀──── MOSS (Semantic Search) ─────────────┘
```

- **Backend** (Elysia on Bun) handles API routes, file storage, authentication, and orchestrates MOSS + OpenCode
- **Frontend** (Next.js 16) provides the dashboard, product catalog, diagnostics chat, and company management
- **Supabase** serves as database (Postgres), file storage (PDFs/images), and authentication provider
- **MOSS** provides real-time semantic search on uploaded manuals — queries run in-memory in ~10ms
- **OpenCode** powers the AI diagnostic engine with product-specific context

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Next.js (App Router, TypeScript, React) | 16.2.9 |
| Styling | Tailwind CSS | v4.3 |
| Backend | Elysia (Bun runtime) | 1.4.28 |
| Database | Supabase (Postgres) | — |
| Storage | Supabase Storage (product-assets bucket) | — |
| Auth | Supabase SSR (Google OAuth + Email/Password) | — |
| Semantic Search | MOSS (`@moss-dev/moss`) | ^1.1.0 |
| AI Engine | OpenCode (mimo-v2.5-free) | — |
| PDF Parsing | pdf-parse | 2.4.5 |
| Runtime | Bun | 1.3.14 |

## Prerequisites

- **Bun** v1.3.14+ (`curl -fsSL https://bun.sh/install | bash`)
- **Supabase** account (free tier: https://supabase.com) — provides Postgres DB, file storage, and auth
- **MOSS** account (free Developer plan: https://moss.dev) — provides semantic search
- **OpenCode** API key (https://opencode.ai) — provides AI diagnostics

## From-Scratch Setup

### 1. Clone and Install

```bash
git clone <repo-url> mantis
cd mantis

# Install backend
cd backend && bun install && cd ..

# Install frontend
cd frontend && bun install && cd ..
```

### 2. Configure Supabase

1. Create a new project at https://supabase.com
2. Go to **Project Settings > API** and copy `Project URL` and `service_role key`
3. Go to **Authentication > Providers** and enable Google OAuth + Email/Password
4. Create a storage bucket called `product-assets` (public)
5. Run the SQL migrations in `backend/supabase/migrations/` via the SQL Editor:
   - `000_create_products.sql` — products table
   - `001_create_user_roles.sql` — user roles
   - `002_create_companies.sql` — companies table
   - `003_create_storage_bucket.sql` — storage policies (may already exist)
   - `004_create_product_resources.sql` — product resources table
   - `005_create_conversations.sql` — conversations table for persistent diagnostics

### 3. Configure MOSS

1. Create an account at https://moss.dev
2. Create a new project and copy the **Project ID** and **Project Key**
3. The shared index `"manuals"` is auto-created on first upload

### 4. Configure OpenCode

1. Get an API key from https://opencode.ai
2. Default endpoint: `https://opencode.ai/zen/v1`
3. Default model: `mimo-v2.5-free`

### 5. Environment Variables

```bash
cp backend/.env.example backend/.env
```

Fill in:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_API_KEY=your_service_role_key
MOSS_PROJECT_ID=your_moss_project_id
MOSS_PROJECT_KEY=your_moss_project_key
OPENCODE_API_KEY=your_opencode_api_key

# Optional — defaults shown
PORT=8000
FRONTEND_URL=http://localhost:3000
OPENCODE_BASE_URL=https://opencode.ai/zen/v1
OPENCODE_MODEL=mimo-v2.5-free

# Optional — auto-assign roles on login (email:role, comma-separated)
AUTH_EMAIL_WHITELIST=admin@mantis.demo:admin,company@mantis.demo:user
```

### 6. Start Development

```bash
# Terminal 1 — Backend
cd backend
bun run dev    # Elysia on http://localhost:8000

# Terminal 2 — Frontend
cd frontend
bun dev        # Next.js on http://localhost:3000
```

Both support hot-reloading. Open `http://localhost:3000`.

### 7. (Optional) Seed Mock Data

```bash
cd backend
bun run seed
```

Creates two demo accounts for local development:

| Account | Email | Password | Role |
|---------|-------|----------|------|
| Superadmin | `admin@mantis.demo` | `admin123456` | Global admin — full access |
| Company Admin | `company@mantis.demo` | `company123456` | Admin of "Demo Outdoors Co." |

The seed script also creates a demo company **"Demo Outdoors Co."** (`slug: demo-outdoors`)
and assigns the company admin to it. It is idempotent — safe to run multiple times.

## How It Works

### Upload Flow

1. User uploads a PDF manual with product metadata (title, description, tags, image) via the Dashboard
2. Backend uploads the PDF to Supabase Storage and gets a public URL
3. Backend parses the PDF locally with `pdf-parse`, extracting text per page
4. Text is **chunked** into ~300-token segments with ~50-token overlap (`backend/src/moss/chunker.ts`)
5. Chunks are indexed into the shared MOSS `"manuals"` index with metadata `{ productId, page, chunkIndex }` via `moss.addDocs('manuals', docs, { upsert: true })`
6. Product metadata is upserted into Supabase `products` table
7. A `product_resources` row is created to track the PDF file

### Diagnostics Flow

1. User navigates to `/diagnostics` (bare or via Diagnose button with `?product=ID`)
2. Conversation list loads from `GET /api/conversations` — persisted per user in Supabase
3. If coming from a Diagnose button with a product ID: auto-creates a conversation titled "Diagnosing: [Product Name]" linked to that product (guarded against duplicates)
4. User selects a conversation or creates a new one via the `+` button
5. User asks a question: backend queries the shared `"manuals"` index with a metadata filter `{ productId: { $in: [selectedIds] } }` using hybrid search (`alpha: 0.5`)
6. Top 3 results are pulled as context
7. If a chat session exists, session history is also queried in parallel via `Promise.allSettled`
8. Context is fed to OpenCode with a structured diagnostic prompt
9. OpenCode returns `{ answer, suggestedActions, relatedProducts }` in JSON
10. The answer is stored back to the session with enriched metadata (`{ role, type, conclusion }`)
11. Suggested actions and manual references populate the right sidebar dynamically (no hardcoded data)

### Delete Flow

1. User clicks Delete on a product card
2. Confirmation modal appears with warning
3. Backend deletes the product row from Supabase
4. Backend fetches all MOSS docs, filters by `metadata.productId`, and calls `moss.deleteDocs('manuals', ids)`
5. Supabase `products` row is deleted (FK cascade handles resources)
6. MOSS cleanup is non-fatal — Supabase delete succeeds even if MOSS fails

## API Reference

### Products

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/products` | Optional | List all products |
| `POST` | `/api/products` | Company Member | Create a product |
| `PUT` | `/api/products/:id` | Company Member | Update title, description, tags |
| `DELETE` | `/api/products/:id` | Company Member | Delete product + cleanup MOSS index |

### Manuals & Resources

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/upload-manual` | Company Member | Upload PDF + index in MOSS |
| `GET` | `/api/manuals` | Any Auth | List uploaded manuals |
| `GET` | `/api/products/:id/resources` | Optional | List product resources |
| `POST` | `/api/products/:id/resources` | Company Member | Add image/video/link resource |
| `DELETE` | `/api/products/:id/resources/:resourceId` | Company Member | Delete a resource |

### Conversations

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/conversations` | Required | List user's conversations |
| `POST` | `/api/conversations` | Required | Create a conversation (optional `productId`) |
| `PATCH` | `/api/conversations/:id` | Required | Update conversation title |
| `DELETE` | `/api/conversations/:id` | Required | Delete a conversation |

### Diagnostics

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/diagnose` | Optional | Single-shot diagnostic query |
| `POST` | `/api/ask` | Optional | Chat with session-aware diagnostics |
| `POST` | `/api/chat/end` | Optional | End a chat session |

### Admin

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/companies` | Global Admin | List all companies (paginated) |
| `POST` | `/api/admin/companies` | Global Admin | Create a new company |
| `POST` | `/api/admin/companies/:id/members` | Global Admin | Assign a user as company admin |
| `DELETE` | `/api/admin/companies/:id` | Global Admin | Delete a company (fails if products exist) |

### Health

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Health check |

## MOSS Integration Details

### Shared Index Architecture

All products share a single MOSS index called `"manuals"`. This solves the Developer plan's 3-index limit:

```
Before: product-a → index "product-a"   (1 per product — hits limit at #3)
        product-b → index "product-b"
        product-c → index "product-c"

After:  All products → index "manuals" with metadata { productId }
        Queries filtered by: { field: 'productId', condition: { $in: [...] } }
```

### Chunking (`backend/src/moss/chunker.ts`)

- **Target**: 300 tokens (~1200 chars) per chunk
- **Overlap**: 50 tokens (~200 chars) between consecutive chunks — preserves context across boundaries
- **Boilerplate stripping**: Removes page numbers, separators, control characters
- **Over-stripping guard**: If stripping removes >50% of text, falls back to original

### Hybrid Search

- **Mode**: Hybrid (keyword + semantic blended)
- **Alpha**: 0.5 — equal weight to keyword and semantic matching (good for technical manuals with part numbers, error codes, SKUs)

### Error Handling

MOSS errors are mapped to a typed discriminant union via `backend/src/moss/types.ts`:

```
MossError { type: 'unauthorized' | 'indexNotFound' | 'notLoaded' | 'generic' }
```

All MOSS operations in endpoint handlers are non-fatal — if MOSS fails, endpoints return degraded 200s with empty results.

### Caching

The shared index is loaded once with:
- **`cachePath`**: `./.moss-cache` — persists index to disk across server restarts
- **`autoRefresh`**: true — polls cloud every 120s for updates
- **Graceful fallback**: If cache directory can't be created, falls back to memory-only

## Project Structure

```
mantis/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── env.ts           # Environment variable loader
│   │   │   └── supabase.ts      # Supabase client singleton
│   │   ├── middlewares/
│   │   │   └── auth.ts          # Auth guards (requireAnyAuth, optionalAuth, etc.)
│   │   ├── moss/
│   │   │   ├── client.ts        # MOSS client — shared index, sessions, query helper
│   │   │   ├── chunker.ts       # PDF text chunker
│   │   │   └── types.ts         # Typed wrappers
│   │   ├── routes/
│   │   │   ├── index.ts         # Route registration
│   │   │   ├── product.ts       # Product CRUD, upload, diagnose, ask
│   │   │   ├── conversations.ts # Conversation CRUD (persistent diagnostics)
│   │   │   └── resources.ts     # Product resources CRUD
│   │   └── index.ts             # Elysia app entry point
│   ├── supabase/migrations/     # SQL migrations (run in Supabase SQL Editor)
│   ├── scripts/
│   │   ├── build.ts             # Production build
│   │   ├── migrate.ts           # DB migration runner
│   │   └── seed.ts              # Seed mock accounts & demo company
│   └── test/                    # Backend tests (bun:test)
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/       # Company dashboard (upload, manage products)
│       │   ├── diagnostics/     # AI diagnostics chat
│       │   ├── products/        # Product marketplace catalog
│       │   └── admin/           # Admin panel
│       ├── components/          # Shared components (Navbar, DiagnosticAssistant)
│       ├── contexts/            # AuthContext, etc.
│       └── utils/supabase/      # Supabase SSR utilities
└── docs/                        # Additional documentation
```

## Auth Model

| Role | Permissions |
|------|------------|
| **Admin** | Full access — create/edit/delete any product, manage all companies, root access |
| **Company Admin** | Manage their company's members, upload/edit/delete their company's products |
| **Company Member** | Upload/edit/delete their company's products |
| **Authenticated User** | View products, run diagnostics |
| **Anonymous** | View products, run diagnostics (diagnose endpoint) |

## Design System

| Token | Value | Usage |
|-------|-------|-------|
| `mantis-green` | `#16a34a` | Primary accent |
| `mantis-green-dark` | `#15803d` | Hover state |
| `mantis-green-light` | `#f0fdf4` | Active tint |
| Background | `bg-slate-50` | Page background |
| Surface | `bg-white` | Cards, modals |
| Borders | `border-slate-200/80` | Default borders |
| Heading | `Plus Jakarta Sans` | Display font |
| Body | `Manrope` | Text font |

## Testing

```bash
cd backend
bun test          # 8 tests (product CRUD, health, upload validation, ask, chat)
```

Tests use `mockFetch` to intercept external API calls and `app.handle()` for in-process Elysia request handling.

## MOSS Cloud Cleanup

Old per-product indexes created before the shared index migration are orphaned. To clean them up:

```ts
const client = new MossClient(PROJECT_ID, PROJECT_KEY);
const indexes = await client.listIndexes();
const oldProductIndexes = indexes.filter(i => i.name !== 'manuals');
for (const idx of oldProductIndexes) {
  await client.deleteIndex(idx.name);
}
```

## Upgrading from Previous Versions

If upgrading from the old per-product index architecture:
1. Run migration `004_create_product_resources.sql` in Supabase SQL Editor
2. Re-upload existing product PDFs to populate the shared `"manuals"` index
3. Delete old per-product indexes from MOSS (see above)
4. Update `.env` — `GEMINI_API_KEY` was replaced with `OPENCODE_API_KEY`
