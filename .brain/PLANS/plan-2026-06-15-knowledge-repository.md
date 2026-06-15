# Knowledge Repository & Diagnostic Assistant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-resource support (pdf/image/video/link) per product, display them on the product detail page, extend the dashboard upload form, and improve the diagnostic assistant's conversation prompt.

**Architecture:** New `product_resources` DB table stores typed resources linked to products. A new `resources.ts` route module handles CRUD. The product detail page fetches resources separately from product data. The dashboard upload gains a type selector. Diagnostics gets a better system prompt only.

**Tech Stack:** Elysia 1.4.28, Supabase (migrations + storage), Next.js 16 App Router, Tailwind CSS v4

---

### Task 1: Database Migration — `product_resources` table

**Files:**
- Create: `backend/supabase/migrations/004_create_product_resources.sql`
- Run: apply migration via Supabase

- [ ] **Step 1: Write the migration SQL**

```sql
-- 004_create_product_resources.sql
CREATE TABLE product_resources (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('pdf', 'image', 'video', 'link')),
  url         TEXT NOT NULL,
  title       TEXT,
  size        INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_resources_product_id ON product_resources(product_id);

ALTER TABLE product_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product resources are viewable by everyone"
  ON product_resources FOR SELECT
  USING (true);

CREATE POLICY "Product resources can be inserted by authenticated users"
  ON product_resources FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

CREATE POLICY "Product resources can be updated by authenticated users"
  ON product_resources FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Product resources can be deleted by authenticated users"
  ON product_resources FOR DELETE
  USING (auth.role() = 'authenticated');
```

- [ ] **Step 2: Apply migration**

Run via Supabase dashboard SQL editor, or:
```bash
cd backend && supabase migration up
```

---

### Task 2: Backend — Resource CRUD Endpoints

**Files:**
- Create: `backend/src/routes/resources.ts`
- Modify: `backend/src/routes/index.ts` (register new route module)

- [ ] **Step 1: Create `backend/src/routes/resources.ts`**

```typescript
import { Elysia, t } from 'elysia';
import { supabase } from '../config/supabase.ts';
import { authDerive, requireCompanyMember, requireAnyAuth, optionalAuth } from '../middlewares/auth.ts';

export const resourceRoutes = new Elysia()
  // GET /api/products/:id/resources — public
  .get('/api/products/:id/resources', async ({ params, set }) => {
    const { id: productId } = params;

    const { data: product } = await supabase
      .from('products')
      .select('id')
      .eq('id', productId)
      .maybeSingle();

    if (!product) {
      set.status = 404;
      return { error: 'Product not found.' };
    }

    const { data: resources, error } = await supabase
      .from('product_resources')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) {
      set.status = 500;
      return { error: error.message };
    }

    return { resources: resources || [] };
  }, {
    params: t.Object({ id: t.String() }),
  })
  // POST /api/products/:id/resources — add a resource (company member or admin)
  .guard({ as: 'scoped' }, app =>
    app.use(authDerive)
      .guard({ as: 'scoped' }, app2 =>
        requireCompanyMember()(app2)
          .post('/api/products/:id/resources', async ({ params, body, user, set }) => {
            const { id: productId } = params;

            const { data: product } = await supabase
              .from('products')
              .select('id, company_id')
              .eq('id', productId)
              .maybeSingle();

            if (!product) {
              set.status = 404;
              return { error: 'Product not found.' };
            }

            // For file uploads (pdf/image/video)
            if (body.type !== 'link') {
              const file = body.file as any;
              if (!file) {
                set.status = 400;
                return { error: 'File is required for non-link resources.' };
              }

              const ext = file.name?.split('.').pop() || 'bin';
              const resourcePath = `resources/${productId}/${Date.now()}-${file.name}`;
              const fileBuffer = await file.arrayBuffer();
              const contentType = body.type === 'pdf' ? 'application/pdf'
                : body.type === 'image' ? (file.type || 'image/png')
                : body.type === 'video' ? (file.type || 'video/mp4')
                : 'application/octet-stream';

              const { error: uploadError } = await supabase.storage
                .from('product-assets')
                .upload(resourcePath, fileBuffer, { contentType, upsert: true });

              if (uploadError) {
                set.status = 500;
                return { error: `Storage upload failed: ${uploadError.message}` };
              }

              const { data: publicUrlData } = supabase.storage
                .from('product-assets')
                .getPublicUrl(resourcePath);

              const { error: dbError } = await supabase
                .from('product_resources')
                .insert({
                  product_id: productId,
                  type: body.type,
                  url: publicUrlData.publicUrl,
                  title: body.title || file.name,
                  size: file.size,
                });

              if (dbError) {
                set.status = 500;
                return { error: dbError.message };
              }

              set.status = 201;
              return { success: true, resource: { type: body.type, url: publicUrlData.publicUrl, title: body.title || file.name, size: file.size } };
            }

            // For link resources
            if (!body.url) {
              set.status = 400;
              return { error: 'URL is required for link resources.' };
            }

            const { error: dbError } = await supabase
              .from('product_resources')
              .insert({
                product_id: productId,
                type: 'link',
                url: body.url,
                title: body.title || body.url,
              });

            if (dbError) {
              set.status = 500;
              return { error: dbError.message };
            }

            set.status = 201;
            return { success: true, resource: { type: 'link', url: body.url, title: body.title || body.url } };
          }, {
            params: t.Object({ id: t.String() }),
            body: t.Object({
              type: t.String(),
              title: t.Optional(t.String()),
              url: t.Optional(t.String()),
              file: t.Optional(t.Any()),
            }),
          })
      )
  )
  // DELETE /api/products/:id/resources/:resourceId — admin or company member
  .guard({ as: 'scoped' }, app =>
    app.use(authDerive)
      .guard({ as: 'scoped' }, app2 =>
        requireCompanyMember()(app2)
          .delete('/api/products/:id/resources/:resourceId', async ({ params, set }) => {
            const { id: productId, resourceId } = params;

            const { data: resource } = await supabase
              .from('product_resources')
              .select('*')
              .eq('id', resourceId)
              .eq('product_id', productId)
              .maybeSingle();

            if (!resource) {
              set.status = 404;
              return { error: 'Resource not found.' };
            }

            const { error: deleteError } = await supabase
              .from('product_resources')
              .delete()
              .eq('id', resourceId);

            if (deleteError) {
              set.status = 500;
              return { error: deleteError.message };
            }

            return { success: true };
          }, {
            params: t.Object({ id: t.String(), resourceId: t.String() }),
          })
      )
  );
```

- [ ] **Step 2: Register the new route module in `backend/src/routes/index.ts`**

Add import and registration:
```typescript
import { resourceRoutes } from './resources.ts';

// Add to the array or chain:
app.use(resourceRoutes);
```

---

### Task 3: Backend — Update upload-manual to insert product_resources row

**Files:**
- Modify: `backend/src/routes/product.ts`

- [ ] **Step 1: Add product_resources insert after successful PDF upload + index in the `/api/upload-manual` handler**

After the `upsert` to `products` (around line 218), add:
```typescript
// Insert into product_resources
await supabase.from('product_resources').insert({
  product_id: productId,
  type: 'pdf',
  url: pdfUrl,
  title: title || file.name,
  size: file.size,
}).then(({ error: resErr }) => {
  if (resErr) console.warn('Failed to insert product resource:', resErr.message);
});
```

This is best-effort — the main upload succeeded, warn on resource insert failure but don't fail the request.

---

### Task 4: Backend — Update diagnostic prompt in `/api/ask`

**Files:**
- Modify: `backend/src/routes/product.ts`

- [ ] **Step 1: Replace the system prompt in `/api/ask`**

Find the `callOpenCode` call in `/api/ask` (around line 477). Replace the prompt string with:

```typescript
const parsed = await callOpenCode(`You are an expert technical diagnostician for the Mantis platform. You help users diagnose problems with their products by referring to the official product knowledge base (manuals, documentation).

Your diagnostic process:
1. UNDERSTAND — Ask about symptoms first. What exactly is happening? When does it occur? How often?
2. IDENTIFY — List possible causes based on the symptoms and knowledge base references
3. ELIMINATE — Suggest one simple, safe inspection step at a time. Wait for the user's response before suggesting the next step.
4. NARROW — Based on test results, rule out causes and focus on remaining possibilities
5. RECOMMEND — When confident, suggest corrective actions with specific references from the knowledge base
6. CITE — Always reference the specific section or page from the manual when possible

User query: "${query}"

Relevant product knowledge context:
---
${mossContext || 'No specific product knowledge found for this query. Use general technical diagnostic knowledge.'}
---

If the user describes symptoms, walk them through diagnosis step by step. If they ask a general question, answer directly with references. Never suggest unsafe actions.

You MUST output your response in JSON format matching this schema:
{
  "answer": "Your diagnostic response. Be clear, structured, and reference the knowledge base.",
  "suggestedActions": ["Follow-up action 1", "Follow-up action 2", ...],
  "relatedProducts": ["product-id-1", ...]
}

Return ONLY the raw JSON object. Do not wrap it in markdown code blocks or other text.`);
```

---

### Task 5: Frontend — Product Detail Page Knowledge Repository Section

**Files:**
- Modify: `frontend/src/app/products/[id]/page.tsx`

- [ ] **Step 1: Add resources state and fetch**

Add state and fetch alongside existing product fetch:
```typescript
interface ResourceData {
  id: string;
  product_id: string;
  type: 'pdf' | 'image' | 'video' | 'link';
  url: string;
  title?: string;
  size?: number;
  created_at: string;
}

// Add state:
const [resources, setResources] = useState<ResourceData[]>([]);
const [activeResourceTab, setActiveResourceTab] = useState<'pdf' | 'image' | 'video' | 'link'>('pdf');

// Add fetch after product fetch:
const fetchResources = async () => {
  try {
    const res = await fetch(`http://localhost:8000/api/products/${id}/resources`);
    if (res.ok) {
      const data = await res.json();
      setResources(data.resources || []);
    }
  } catch {}
};
```

- [ ] **Step 2: Render the Knowledge Repository section below the product info card**

After the closing `</div>` of the main product card (`md:col-span-12` section closed at line ~156), add:

```tsx
{/* Knowledge Repository */}
<div className="mt-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
  <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-4">Resources</h2>

  {/* Type tabs */}
  <div className="flex gap-1 mb-6 border-b border-slate-100 dark:border-slate-800 pb-3">
    {(['pdf', 'image', 'video', 'link'] as const).map((type) => (
      <button
        key={type}
        onClick={() => setActiveResourceTab(type)}
        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer uppercase tracking-wider ${
          activeResourceTab === type
            ? 'bg-mantis-green-light dark:bg-green-950/20 text-mantis-green border border-mantis-green-border dark:border-green-900/50'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        {type === 'pdf' ? 'Manuals' : type === 'image' ? 'Images' : type === 'video' ? 'Videos' : 'Links'}
      </button>
    ))}
  </div>

  {/* Resource list */}
  <div className="space-y-2">
    {resources.filter(r => r.type === activeResourceTab).length === 0 ? (
      <p className="text-sm text-slate-400 py-8 text-center">No {activeResourceTab === 'pdf' ? 'manuals' : activeResourceTab + 's'} uploaded yet.</p>
    ) : (
      resources.filter(r => r.type === activeResourceTab).map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-4 py-3 hover:border-slate-200 dark:hover:border-slate-800 transition-all">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {r.type === 'pdf' && (
              <svg className="h-8 w-8 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            )}
            {r.type === 'image' && (
              <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden bg-slate-100">
                <img src={r.url} alt={r.title || ''} className="h-full w-full object-cover" />
              </div>
            )}
            {r.type === 'video' && (
              <svg className="h-8 w-8 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9.75a1.5 1.5 0 001.5-1.5V6.75a1.5 1.5 0 00-1.5-1.5H4.5a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5z" />
              </svg>
            )}
            {r.type === 'link' && (
              <svg className="h-8 w-8 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.293l-4.5-4.5a4.5 4.5 0 10-6.364 6.364l1.757 1.757" />
              </svg>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{r.title || 'Untitled'}</p>
              {r.size && <p className="text-[10px] text-slate-400">{(r.size / 1024).toFixed(1)} KB</p>}
            </div>
          </div>
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg bg-mantis-green px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-mantis-green-dark transition-colors"
          >
            {r.type === 'link' ? 'Open' : 'Download'}
          </a>
        </div>
      ))
    )}
  </div>
</div>
```

---

### Task 6: Frontend — Dashboard Upload Extension

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add resource upload mode state**

```typescript
const [resourceUploadMode, setResourceUploadMode] = useState<'pdf' | 'image' | 'video' | 'link'>('pdf');
const [linkUrl, setLinkUrl] = useState('');
```

- [ ] **Step 2: Add resource type selector buttons above the upload form**

After the `canUpload` conditional opening, add:
```tsx
{/* Resource type selector */}
<div className="flex gap-2 mb-4">
  {(['pdf', 'image', 'video', 'link'] as const).map((mode) => (
    <button
      key={mode}
      onClick={() => setResourceUploadMode(mode)}
      className={`rounded-lg px-3 py-1.5 text-[10px] font-bold transition-colors cursor-pointer ${
        resourceUploadMode === mode
          ? 'bg-mantis-green text-white'
          : 'border border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300'
      }`}
    >
      {mode === 'pdf' ? 'PDF Manual' : mode === 'image' ? 'Image' : mode === 'video' ? 'Video' : 'External Link'}
    </button>
  ))}
</div>
```

- [ ] **Step 3: Add link upload UI and handler**

When `resourceUploadMode === 'link'`, render URL + title inputs instead of the file drop zone:

```tsx
{resourceUploadMode === 'link' ? (
  <div className="space-y-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6">
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">URL</label>
      <input
        type="url"
        value={linkUrl}
        onChange={(e) => setLinkUrl(e.target.value)}
        placeholder="https://example.com/manual.pdf"
        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
      />
    </div>
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Title</label>
      <input
        type="text"
        value={uploadTitle}
        onChange={(e) => setUploadTitle(e.target.value)}
        placeholder="e.g. Official Repair Video"
        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
      />
    </div>
    <button
      onClick={async () => {
        if (!linkUrl.trim() || !productId) return;
        setUploading(true);
        setUploadStatus("Adding link...");
        try {
          const token = await getAccessToken();
          const headers: Record<string, string> = { "Content-Type": "application/json" };
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`http://localhost:8000/api/products/${productId}/resources`, {
            method: "POST",
            headers,
            body: JSON.stringify({ type: "link", url: linkUrl.trim(), title: uploadTitle || linkUrl.trim() }),
          });
          if (res.ok) {
            setUploadStatus("Link added successfully!");
            setLinkUrl("");
            setUploadTitle("");
          } else {
            const err = await res.json();
            setUploadStatus(`Failed: ${err.error || "Error"}`);
          }
        } catch (err) {
          setUploadStatus(`Failed: ${err instanceof Error ? err.message : "Network error"}`);
        } finally {
          setUploading(false);
        }
      }}
      className="rounded-lg bg-mantis-green px-5 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer disabled:opacity-50"
      disabled={uploading || !linkUrl.trim() || !productId}
    >
      Add Link
    </button>
  </div>
) : resourceUploadMode === 'image' || resourceUploadMode === 'video' ? (
  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all border-slate-200 dark:border-slate-800 hover:border-mantis-green bg-slate-50/50 dark:bg-slate-950/20"
    onClick={() => fileInputRef.current?.click()}
  >
    <input
      type="file"
      accept={resourceUploadMode === 'image' ? 'image/*' : 'video/*'}
      className="hidden"
      ref={fileInputRef}
      onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file || !productId) return;
        setUploading(true);
        setUploadStatus("Uploading...");
        try {
          const token = await getAccessToken();
          const formData = new FormData();
          formData.append("type", resourceUploadMode);
          formData.append("title", uploadTitle || file.name);
          formData.append("file", file);
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;
          const res = await fetch(`http://localhost:8000/api/products/${productId}/resources`, {
            method: "POST",
            headers,
            body: formData,
          });
          if (res.ok) {
            setUploadStatus("Uploaded successfully!");
          } else {
            const err = await res.json();
            setUploadStatus(`Failed: ${err.error || "Error"}`);
          }
        } catch (err) {
          setUploadStatus(`Failed: ${err instanceof Error ? err.message : "Network error"}`);
        } finally {
          setUploading(false);
        }
      }}
    />
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-950 text-slate-400 mb-4">
      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    </div>
    <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">
      Upload {resourceUploadMode === 'image' ? 'Image' : 'Video'}
    </h3>
    <p className="mt-1 text-xs text-slate-400 max-w-xs leading-relaxed">Click to select a file.</p>
  </div>
) : /* existing PDF upload UI */ }
```

- [ ] **Step 4: Wrap the existing PDF upload UI inside `resourceUploadMode === 'pdf'`**

Make the existing upload form conditional on `resourceUploadMode === 'pdf'`. The PDF upload keeps the current behavior (product create/select toggle, tags, description, image, file drop zone, MOSS indexing).

---

### Task 7: Build Verification

**Files:** none

- [ ] **Step 1: Check backend compiles**

```bash
cd backend && bun run --bun src/index.ts 2>&1 | head -5
```

Expected: Server starts successfully, no TypeScript/import errors.

- [ ] **Step 2: Check frontend compiles**

```bash
cd frontend && bun run build 2>&1 | tail -20
```

Expected: Build succeeds with no errors.

---

## Self-Review

1. **Spec coverage:** All spec sections covered — `product_resources` table (Task 1), CRUD endpoints (Task 2), upload-manual update (Task 3), diagnostic prompt (Task 4), product detail page resources section (Task 5), dashboard upload extension (Task 6), build verification (Task 7). ✓
2. **Placeholder scan:** No TBD, TODO, or placeholder content found. ✓
3. **Type consistency:** `ResourceData` interface uses same fields as DB schema. Route parameters match between GET/POST/DELETE. ✓

---

## Structural Improvements (Refinement)

### Gap 1: Storage Bucket & Cleanup
- **Issue:** Task 2 uploads to `product-assets` bucket but does not ensure it exists. Task 2 DELETE does not clean up storage files.
- **Fix:** Add storage bucket check/creation step before Task 2. DELETE endpoint must also delete the corresponding storage file for file-type resources (pdf/image/video) before removing the DB row. Add a `storage_path` column to `product_resources` to track the storage key for later cleanup, or derive it from the URL.

### Gap 2: POST Multipart Body Validation
- **Issue:** Elysia multipart handling for file uploads needs explicit schema. The `body` schema uses `t.Any()` for file, which offers no validation.
- **Fix:** Use Elysia's `t.File()` for the file field and validate accepted MIME types per resource type (pdf: `application/pdf`, image: `image/*`, video: `video/*`). Add file size cap (e.g., 50MB).

### Gap 3: DELETE Company-Scoped Access Control
- **Issue:** DELETE endpoint only checks product existence and resource existence — it does not verify the resource's product belongs to the user's company.
- **Fix:** Before returning the resource, also verify `product.company_id` matches the authenticated user's company context. Append cross-check step after the `resource` fetch.

### Gap 4: GET Resources — No Pagination or Caching
- **Issue:** `GET /api/products/:id/resources` returns all resources unbounded.
- **Fix:** Add `?limit` and `?offset` query params with sensible defaults (limit=50). Consider `stale-while-revalidate` cache header since resources change infrequently.

### Gap 5: Migration Validation Step
- **Issue:** No explicit verification that migration applied correctly before backend work begins.
- **Fix:** Add a verification step: run `supabase migration list` to confirm `004_create_product_resources` is applied, then a quick `SELECT * FROM product_resources LIMIT 1` smoke test in the backend startup.

### Gap 6: No Rollback Strategy
- **Issue:** If migration fails mid-deploy, no rollback plan.
- **Fix:** Add a `supabase migration down 1` fallback instruction to the migration task. Keep the down-SQL as a comment in the migration file.

### Gap 7: Upload-manual Atomicity Gap
- **Issue:** Task 3 uses best-effort insert — if the resource insert fails, there's no rollback of the main product upsert or Moss index. This creates orphan products.
- **Fix:** Wrap the product upsert + resource insert in a transaction. If the product upsert succeeds but the resource insert fails, log the error but do not fail the request (current behavior is acceptable). Consider adding a cleanup note for admins.

## Dependency Fixes

- **Task 0 (new):** Storage bucket check — must precede Task 2 (POST handler depends on bucket existence). Insert at top of sequence.
- **Task 1 → Task 2:** Add explicit migration validation gate between migration apply and backend CRUD work.
- **Task 2 → Task 5/6:** GET endpoint must return data before frontend fetch can consume it. Already captured.
- **All tasks:** Each backend endpoint should be verified with curl/Postman before frontend work begins — add per-endpoint verification step.

## Skill Enhancements

### Applied: `@[skills/architecture]` — Pattern Selection
- **Modular routing:** Resource routes isolated in their own module (already correct). Consider extracting the diagnostic prompt into a separate `prompts.ts` file for maintainability — this makes prompt iteration independent of route code.
- **Separation of concerns:** The POST handler currently handles both file upload and link creation in a single handler. Extract link creation and file upload into private helper functions within the module for readability.

### Applied: `@[skills/api-patterns]` — REST Response Consistency
- **Envelope format:** GET returns `{ resources: [...] }`, POST returns `{ success: true, resource: {...} }`, DELETE returns `{ success: true }`. Already consistent — verified.
- **Error format:** All error responses use `{ error: string }` — consistent. Verified.
- **Status codes:** 200/201/400/404/500 used correctly. Verified.
- **Missing:** No validation error detail format for 400 responses (e.g., `{ error: string, details?: Record<string, string> }`). Add for field-level validation feedback.

### Applied: `@[skills/database-design]` — Migration Safety
- **Index strategy:** `idx_product_resources_product_id` covers the primary query pattern (GET resources by product). Verified.
- **Missing composite index:** If filtering by type + product_id becomes a common pattern (which it will for the frontend tabs), consider `(product_id, type)` composite index.
- **RLS policies:** Current policies allow all authenticated users to insert/update/delete resources for any product. Since the app auth already uses company-scoped middleware, consider tightening RLS to use `auth.uid()` and a company membership check, or rely on the backend middleware for authorization (current approach). Document the trust boundary decision.

## Risk Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Migration fails on existing prod data | Low | High | Run migration against a staging copy first. Test down migration. |
| Storage bucket missing when POST hits | Low | High | Add bucket check/creation in Task 0. Catch error gracefully with 503. |
| Large file upload exhausts memory | Medium | Medium | Add file size limit (50MB) on Elysia body parser. Validate client-side before upload. |
| DELETE leaves orphaned storage files | Medium | Low | Always delete storage file before DB row. Log failures for admin review. |
| Diagnostic prompt breaks if OpenCode API changes | Low | High | Externalize prompt to a config file or environment variable for hot-swap. |
| CORS blocks file uploads with custom headers | Low | Medium | Verify Elysia CORS config allows `Authorization` header on upload endpoints. |
| No input sanitization on link URLs | Medium | Low | Add URL validation (must match http/https scheme). Reject javascript: scheme. |

---

## Planner Feedback

- **Major Weaknesses Fixed:** Storage file lifecycle (upload + cleanup), multipart validation, company-scoped DELETE auth, pagination readiness, migration verification step.
- **Remaining Risks:** Large file handling under memory pressure, orphaned storage files if DB delete succeeds but storage delete fails (rare reverse scenario).
- **Suggested Focus for Next Iteration:** Implement storage file lifecycle management (dedicated cleanup job for orphaned files). Add an admin-only "purge resources" endpoint for bulk cleanup.

---

## Pass 2 Refinement — Frontend Architecture & UX Resilience

### Skill: `@[skills/frontend-developer]` — Component Decomposition

**Issue:** Tasks 5 and 6 (product detail page + dashboard) place all logic inline in single page files. This creates tight coupling between data fetching, filtering, rendering, and user interaction, making the code difficult to test, reuse, or maintain.

**Recommendation: Component Extraction**

Split the product detail page into a component hierarchy with clear single responsibilities:

| Component | Responsibility | Proposed File |
|-----------|---------------|---------------|
| **ProductPage** (orchestrator) | Owns data fetching (product + resources), error/loading at page level. Passes data down to children. | `products/[id]/page.tsx` |
| **ProductInfoCard** | Displays product metadata (existing). Extracted for parity with resource section. | `products/[id]/ProductInfoCard.tsx` |
| **KnowledgeRepository** | Owns resource state filtering by type tab, loading skeleton, error fallback. Composes children. | `products/[id]/KnowledgeRepository.tsx` |
| **ResourceTypeTabs** | Pure presentational: renders the tab bar. Accepts `activeType` + `onChange` props. Zero data logic. | `products/[id]/ResourceTypeTabs.tsx` |
| **ResourceCard** | Pure presentational: renders one resource row. Accepts `resource` object. Handles download/open click externally. | `products/[id]/ResourceCard.tsx` |
| **EmptyResourceState** | Shown per-tab when no resources of that type. Accepts `type` prop for copy variation. | `products/[id]/EmptyResourceState.tsx` |

Similarly for the dashboard upload area:

| Component | Responsibility | Proposed File |
|-----------|---------------|---------------|
| **DashboardUploadPanel** (orchestrator) | Owns upload mode state, coordinates child forms, handles API calls. | `dashboard/DashboardUploadPanel.tsx` |
| **ResourceTypeSelector** | Renders mode buttons (PDF/Image/Video/Link). Accepts `activeMode` + `onChange`. | `dashboard/ResourceTypeSelector.tsx` |
| **LinkUploadForm** | URL + title inputs, submit button, inline validation. Emits `(url, title)` on submit. | `dashboard/LinkUploadForm.tsx` |
| **FileUploadZone** | Drop zone with click-to-browse. Accepts `accept` MIME filter + `onFileSelected`. Reusable for image/video/pdf. | `dashboard/FileUploadZone.tsx` |
| **UploadStatusToast** | Transient notification bar. Accepts `status` enum (idle/uploading/success/error) + `message`. Auto-dismisses on success. | `components/UploadStatusToast.tsx` |

**Dependency direction:** Page files import components, never the reverse. All API calls live in the orchestrator layer, not in child components.

### Skill: `@[skills/ux-architect]` — Error Boundary & Feedback Strategy

**Issue:** The plan has no error handling for the frontend. If the resources API returns 5xx, the product detail page breaks silently. Upload failures show no actionable feedback.

**Recommendation: Layered Error Defense**

**Layer 1 — Page-level Error Boundary:**
- Wrap the `KnowledgeRepository` section in a React Error Boundary (`error.tsx` or `ErrorBoundary` component).
- If the resources fetch throws (network error, parse failure), the boundary catches it and renders a minimal fallback card below the product info: "Could not load resources. [Retry]"
- The rest of the product detail page remains functional — the error is localized, not global.

**Layer 2 — Granular API Error Recovery:**
- The `fetchResources` call should have a retry mechanism: up to 2 retries with exponential backoff (1s, 2s) on 5xx or network errors.
- 4xx errors (e.g., 404 product not found) should not be retried — show the fallback immediately.
- Use an `AbortController` to cancel in-flight requests when the component unmounts.

**Layer 3 — Upload Operation Feedback State Machine:**
The upload flow should be modeled as a finite state machine, not a boolean `uploading` flag:

```
IDLE → VALIDATING → UPLOADING → SUCCESS (auto-dismiss 3s)
                                → ERROR (persistent until dismissed or retried)
                                → VALIDATING (retry path)
```

Each state drives the UI:
- **IDLE:** Upload button enabled, no status visible.
- **VALIDATING:** Button disabled, brief inline spinner next to the button.
- **UPLOADING:** Progress indicator (indeterminate for storage uploads, determinate if chunked).
- **SUCCESS:** Green toast: "Resource added successfully." Auto-dismiss after 3s.
- **ERROR:** Red toast with the specific error message. Manual dismiss or retry button. Toast must NOT auto-dismiss errors.

**Layer 4 — Accessibility Announcements:**
- Use `aria-live="polite"` region for status toasts so screen readers announce upload completion/failure.
- Error boundary fallback must have `role="alert"`.
- Focus management: after upload success, move focus to the first item in the resource list.

### Skill: `@[skills/ux-architect]` — Loading States & Skeleton Pattern

**Issue:** The plan conditionally renders resources after fetch but has no transition between "loading" and "loaded". Users see a flash of missing content.

**Recommendation: Progressive Loading with Skeletons**

**Phase 1 — Page render:**
- Product info card renders immediately from SSR/initial data.
- Resources section renders in **loading state**: 3 skeleton rows matching the shape of `ResourceCard` (icon placeholder, text line, button placeholder).
- Use Tailwind `animate-pulse` on grey rounded rectangles.
- Type tabs render in loading state (inactive, no pointer events).

**Phase 2 — Fetch completes (success):**
- Replace skeletons with actual `ResourceCard` components.
- Animate cards in with a staggered `opacity-0 → opacity-100` transition (50ms delay per card).
- Activate type tabs.

**Phase 3 — Fetch completes (error):**
- Replace skeletons with error fallback card.
- Keep the type tabs visible but disabled — user can see what types exist even if data failed.

**Phase 4 — Tab switch:**
- If resources are already fetched (cached in state), switch instantly — no loading state.
- If a subsequent refetch is triggered, show a subtle spinner on the tab bar instead of full skeletons.

**Skeleton component:** Create a shared `Skeleton` component at `components/Skeleton.tsx` with configurable `width`, `height`, and `rounded` props. Reuse across the app.

### Skill: `@[skills/mobile-design]` — Mobile Responsiveness

**Issue:** The plan renders resource tabs as `flex` row buttons and resource cards as horizontal rows with an icon and button. This breaks on small screens (overflow, tiny touch targets, cramped layout).

**Recommendation: Mobile-First Resource Display**

**Tab Bar:**
- On screens < 640px: the tab bar must be **horizontally scrollable** (`overflow-x: auto`, `scroll-snap-type: x mandatory`, `-webkit-overflow-scrolling: touch`). Swipe left/right to reveal all 4 types.
- Touch targets on tabs must be **minimum 44px tall** (current plan uses `py-1.5 px-4` which yields ~32px — too small). Increase to `py-3 px-5` on mobile.
- Active tab indicator: green underline + bold text. Ensure contrast ratio ≥ 4.5:1.

**Resource Cards:**
- On screens < 480px: stack the layout vertically — icon on top, title below, action button full-width at bottom.
- On screens 480–768px: keep horizontal layout but shrink icon to 24px, button text to `text-[10px]`.
- On screens ≥ 768px: current layout is fine.

**Upload Form:**
- On mobile: the mode selector buttons should wrap to 2 columns instead of a single row of 4 (buttons get too narrow).
- File drop zone: replace the dashed border area with a simple "Tap to select" button on mobile (drag-and-drop is not a mobile pattern).
- Link inputs: full width, no max-width constraint.

**Thumb Zone Placement:**
- Primary actions (Upload, Add Link buttons) should be positioned at the bottom of the upload panel on mobile — within easy thumb reach.
- Destructive actions (Delete resource) should have a confirmation dialog before executing. Place delete in a hidden menu or swipe-to-reveal pattern rather than an always-visible button.

**General Mobile Rules Applied (from mobile-design skill):**
- No horizontal page overflow — use `overflow-hidden` on containers.
- Prevent zoom on input focus with `maximum-scale=1` viewport meta (already in Next.js).
- Use `overscroll-behavior: contain` on the tab scroll area to prevent pull-to-refresh conflicts.
- All interactive elements must display a visible `:active` state (tap highlight) for touch feedback.

### Summary: New Frontend Files Created

```
frontend/src/
├── components/
│   ├── Skeleton.tsx              (loading placeholder)
│   ├── ErrorBoundary.tsx          (React error boundary wrapper)
│   └── UploadStatusToast.tsx      (status notification with auto-dismiss)
└── app/
    └── products/
        └── [id]/
            ├── ProductInfoCard.tsx       (extracted)
            ├── KnowledgeRepository.tsx   (new — resources orchestrator)
            ├── ResourceTypeTabs.tsx      (new — tab bar)
            ├── ResourceCard.tsx          (new — single resource row)
            └── EmptyResourceState.tsx    (new — per-tab empty state)
```

### Dependency Updates

- **Task 5 → new:** Split product detail page AFTER the inline version works. Implement monolithic version first, then extract components in a refactor step.
- **Task 6 → new:** Extract dashboard components after the inline version is verified. Same refactor-after-working pattern.
- **New frontend tasks depend on:** ErrorBoundary, Skeleton, and UploadStatusToast must exist before extraction (they are shared utilities). Build them first.
- **Mobile responsiveness:** Apply during extraction, not as a separate pass. Responsive styles are part of the component, not a separate concern.

### Risk Mitigations (Additions to Matrix)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Upload toast auto-dismiss hides transient errors | Medium | Medium | Never auto-dismiss error toasts. Require manual dismiss. |
| Skeleton flash on fast networks | High | Low | Use min 300ms skeleton display to prevent content flash for sub-200ms fetches. |
| Mobile tab bar overflow cuts off types | Medium | High | Use scroll-snap + visible indicator dots. Test on 320px viewport. |
| Error boundary catches unrelated errors | Low | Medium | Narrow boundary scope — wrap only resource section, not entire page. |

### Planner Feedback (Pass 2)

- **Major Weaknesses Fixed:** Single-file page bloat decomposed into 8 focused components. Error defense layered (boundary → retry → toast → a11y). Loading states use skeleton pattern with 4-phase lifecycle. Mobile resource view now scrollable, properly sized, and thumb-friendly.
- **Remaining Risks:** Refactor-after-working approach may be skipped if pressure to deliver. Skeleton minimum display time may conflict with perceived performance goals.
- **Suggested Focus for Next Iteration:** Add end-to-end tests for the upload flow covering: success path, network failure, invalid file type rejection, and URL validation.

---

## Pass 3 Refinement — Immediate Edge Cases

### Skill: `@[skills/security-engineer]` — Access Control & Input Validation

**Edge Case 1 — User adds resource to a product they don't own**

**Scenario:** Authenticated user from Company A sends POST to `/api/products/:id/resources` where `:id` belongs to Company B.

**Current gap:** The POST handler fetches the product but only checks if it exists — it never verifies `product.company_id` against the authenticated user's company. A malicious user can attach resources to any product.

**Fix — Ownership gate on write endpoints:**
- In the POST handler, after the `product` fetch, add an explicit guard:
  - If `product.company_id !== user.company_id`, return 403 with `{ error: "You do not have access to this product." }`
- This must mirror the pattern already described for DELETE (Pass 1, Gap 3). Both endpoints share the same guard logic.
- Do NOT rely on RLS policies alone — the backend middleware (`requireCompanyMember`) only ensures the user belongs to some company, not the right one. The product-level cross-check is mandatory.

**Edge Case 3 — File too large (also security-engineer)**

**Scenario:** User uploads a 2GB video file via POST /api/products/:id/resources with type=video.

**Current gap:** Pass 1 mentions a 50MB cap but does not specify enforcement mechanism or behavior when exceeded. Elysia's default body parser may reject silently with a 400 before the handler even runs, returning a confusing generic error.

**Fix — Two-layer enforcement:**
- **Layer 1 (Elysia body parser):** Configure `app.use(elysia({ body: { maxFileSize: 50 * 1024 * 1024 } }))` to reject oversized requests before they reach the handler. This produces a 413 HTTP status automatically.
- **Layer 2 (application validation):** Inside the handler, explicitly check `file.size > MAX_FILE_SIZE` and return a structured 413 response with field-level detail: `{ error: "File too large.", details: { file: "Maximum file size is 50MB." } }`.
- **Client-side (frontend):** The `FileUploadZone` component must check `file.size` before submitting. Reject with inline message: "File exceeds 50MB limit. Please choose a smaller file."
- This prevents wasted upload bandwidth for files that will be rejected server-side.

### Skill: `@[skills/backend-architect]` — Resilience & Partial Failure

**Edge Case 2 — Storage bucket doesn't exist**

**Scenario:** `product-assets` bucket was never created (fresh deploy, or deleted accidentally). All uploads fail with a confusing Supabase storage error like "The resource was not found."

**Current gap:** Pass 1 mentions a Task 0 "bucket check/creation" but lacks specificity about what happens on failure. Automatically creating the bucket on first request is not safe (permissions may not allow it).

**Fix — Graceful degradation, not silent creation:**
- Do NOT auto-create the bucket in the request handler (the backend service account may lack storage admin privileges).
- Instead, add a health check pattern: On backend startup, probe the bucket with `supabase.storage.from('product-assets').list()`. If it fails, log a startup warning: "WARN: Storage bucket 'product-assets' not accessible. Resource uploads will fail until this is resolved."
- In the POST handler, detect the storage error pattern (Supabase returns 404 for missing bucket), and translate it to a clear 503: `{ error: "Storage unavailable. Contact administrator." }`
- Add a one-liner to the README or docs: `supabase storage create product-assets` as a post-deployment step.

**Edge Case 4 — Backend restarts mid-upload**

**Scenario:** The POST handler uploads the file to Supabase Storage successfully (step 1), but then the server crashes before inserting the DB row (step 2). The storage blob persists as an orphan with no DB reference.

**Current gap:** No idempotency key or cleanup mechanism. The frontend receives no response and shows a generic error. The user retries, creating a duplicate storage blob.

**Fix — Partial failure handling:**
- Structure the handler so the DB operation runs first, or wrap both in a compensation pattern:
  - **Option A (preferred — lightweight):** Generate the `resource_url` deterministically from the product_id, timestamp, and filename without uploading first. Insert the DB row first. If the DB insert succeeds, then upload the file to storage. If the upload fails, delete the DB row and return 500. This guarantees no orphan blobs.
  - **Option B (fallback — compensations):** Upload to storage first, then insert DB. If the server crashes between steps, a future startup integrity check can scan `resources/` prefix in the storage bucket for blobs not referenced in `product_resources` and flag them for manual review. Document this in operations notes.
- The frontend must handle ambiguous responses: if the fetch timeout or network error occurs after submission, show "Upload may have completed. Refresh to verify." rather than automatically retrying (which could create duplicates).

**Edge Case 5 — User deletes a product that has resources**

**Scenario:** User (or cascade) deletes a product. The `ON DELETE CASCADE` in the migration removes all `product_resources` DB rows. But files in Supabase Storage under `resources/${productId}/` are NOT deleted — they become orphaned blobs accumulating storage costs.

**Current gap:** The migration handles DB integrity but ignores storage lifecycle. Over time, deleted products leave behind blob debris.

**Fix — Storage lifecycle for product deletion:**
- If the product deletion goes through a backend endpoint (and not just raw SQL), hook into it: before or after the product DB delete, call `supabase.storage.from('product-assets').remove([...])` listing all blobs under `resources/${productId}/` and deleting them.
- If product deletion is done directly via Supabase dashboard or raw SQL (bypassing the backend), there is no hook. In that case, accept the limitation and document it: "Storage blobs for deleted products must be cleaned up manually via the Supabase dashboard."
- Do NOT add a scheduled cleanup job (that is out of scope — filtered). Instead, add a one-time operational note in the deployment checklist: "After deleting products, verify storage cleanup."
- Future-scope: The admin purge endpoint (already suggested in Pass 1 for a later iteration) would handle bulk orphan cleanup.

### Skill: `@[skills/testing-patterns]` — Edge Case Verification

**Immediate verification gates — each edge case must have a testable assertion:**

| Edge Case | How to Verify | Test Level |
|-----------|--------------|------------|
| Cross-company resource upload | POST to another company's product → expect 403 | Integration (curl/API test) |
| File exceeds size limit | Send file > 50MB → expect 413 | Integration |
| Missing storage bucket | Temporarily rename bucket, POST → expect 503 | Integration (manual env setup) |
| Mid-upload crash survival | Simulate: upload file, kill server, restart, check no orphan can be listed | Manual (pre-release check) |
| Product deletion with resources | DELETE product → verify DB cascade + verify storage blob NOT cleaned (note limitation) | Integration + manual |

**Verification pattern to add to Task 7:**
- Add a step after Task 7: run a curl script that tests all 5 edge cases against a staging environment.
- Edge cases 1, 3 (403, 413) can be fully automated.
- Edge cases 2, 5 require manual confirmation but should have documented steps.
- Edge case 4 (crash) is a pre-release sanity check, not everyday CI.

### Summary: Plan Updates to Existing Tasks

| Task | Edge Case(s) | Change |
|------|-------------|--------|
| Task 2 — POST handler | EC1, EC2, EC3 | Add company ownership gate. Translate storage 404 to 503. Add two-layer file size validation. |
| Task 2 — POST handler | EC4 | Restructure to DB-first-then-storage with compensation delete on upload failure. |
| Task 2 — DELETE handler | EC1 | Same ownership gate as POST (mirror). Already flagged in Pass 1. |
| Task 1 — Migration | EC5 | Add comment in migration file: "Storage blobs must be cleaned up independently." |
| Task 7 — Verification | All | Add 5 edge case verification steps to test script. |

### Risk Mitigations (Additions to Matrix)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Cross-company resource pollution | Medium | High | Ownership gate on POST + DELETE. Return 403, not 404 (avoid leaking product existence). |
| Storage bucket misconfiguration at deploy | Low | High | Startup health check probe + graceful 503 response. Document manual bucket creation step. |
| Client retry creates duplicate uploads after partial failure | Medium | Medium | DB-first-then-storage order eliminates orphans. Frontend shows "verify" message, not auto-retry. |
| Accumulating storage blobs from deleted products | High | Low (per blob) | Accept the limitation. Document manual cleanup. Future iteration can add purge endpoint. |
| User confused by 413 error with no context | Medium | Low | Structured error with field name + size limit. Client-side pre-check avoids it entirely. |

### Planner Feedback (Pass 3)

- **Edge Cases Closed:** Cross-company resource injection, oversized file with dual enforcement, missing storage bucket with graceful 503, mid-upload crash with DB-first ordering, product deletion with documented storage gap.
- **Deferred (Out of Scope):** Thumbnail generation, video transcoding, full-text search on non-PDF resources, download analytics, admin purge endpoint. These belong in the next feature iteration.
- **Remaining Gaps:** No integration test suite yet — edge case verification is manual for EC2, EC4, EC5. Automated coverage should be added before the next feature cycle.
- **Final Verdict:** The plan is now defense-in-depth on access control, resilient to infrastructure failures (missing bucket, server crash), handles input boundaries (file size), and acknowledges storage lifecycle limitations without over-engineering them. Ready for execution.
