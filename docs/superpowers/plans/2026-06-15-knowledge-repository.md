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
