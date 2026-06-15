# Design: Knowledge Repository, Multi-Resource Upload & Diagnostic Assistant

**Date:** 2026-06-15
**Status:** Draft

## Overview

Three tightly coupled features that transform the product detail page into a full knowledge repository and make the diagnostic assistant behave like a real technician.

## 1. Database — `product_resources` Table

A separate table for multiple resources per product, replacing the single `pdf_url`/`image_url` pattern.

```sql
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
```

- Existing `products.pdf_url` and `products.image_url` remain for backwards compatibility
- New resources go into `product_resources` only
- RLS enabled, with SELECT for authenticated users, INSERT/UPDATE/DELETE for product owners/admins

## 2. Backend API — Resource Endpoints

### New Endpoints

**`GET /api/products/:id/resources`** (public, no auth required)
- Returns all resources for a product, ordered by `created_at DESC`
- Response: `{ resources: [{ id, type, url, title, size, created_at }] }`

**`POST /api/products/:id/resources`** (requires company member of product's company, or admin)
- For links: `Content-Type: application/json`, body `{ type: "link", url, title }`
- For files (pdf/image/video): `Content-Type: multipart/form-data`, fields `file`, `title`
- Uploads file to `product-assets` storage bucket, then inserts resource row
- Response: `{ success: true, resource: { id, type, url, title } }`

**`DELETE /api/products/:id/resources/:resourceId`** (requires company member or admin)
- Deletes resource row
- If file resource, also deletes from storage
- Response: `{ success: true }`

### Updated Endpoint

**`POST /api/upload-manual`** — now also inserts a `product_resources` row with `type: 'pdf'` after successful upload and indexing.

### Updated System Prompt for `/api/ask`

Replace the generic prompt with a diagnostic workflow prompt:

```
You are an expert technical diagnostician with deep knowledge of the product's manuals and documentation.

Your diagnostic process:
1. UNDERSTAND — Ask about symptoms first. What exactly is happening? When does it occur?
2. IDENTIFY — List possible causes based on the symptoms and manual references
3. ELIMINATE — Suggest simple, safe inspection steps one at a time. Wait for the user's response before suggesting the next step.
4. NARROW — Based on test results, rule out causes and focus on the most likely remaining ones
5. RECOMMEND — When confident, suggest corrective actions with specific manual page references
6. CITE — Always reference the specific section or page from the manual

If the user asks a general question (not a diagnosis), answer it directly with references.
If the symptoms are vague, ask clarifying questions before jumping to conclusions.
Never suggest unsafe actions (disassembly without proper grounding, etc.).
```

## 3. Frontend — Product Detail Page (`/products/[id]/page.tsx`)

### Knowledge Repository Section

Added below the main product info card, a `Resources` section with type tabs:

```
┌─────────────────────────────────────────────────────┐
│  Resources                                          │
│  ┌─────┬────────┬───────┬───────┐                    │
│  │ PDF │ Images │ Videos│ Links │                    │
│  └─────┴────────┴───────┴───────┘                    │
│                                                       │
│  ▸ Manual_v3.pdf            [Download]  [Date]       │
│  ▸ Quick_Start_Guide.pdf    [Download]  [Date]       │
│                                                       │
│  [Upload new resource] (if user can edit)            │
└─────────────────────────────────────────────────────┘
```

- Tab bar switches between resource types
- PDF tab: list of PDFs with download buttons
- Images tab: grid of thumbnails with lightbox on click
- Videos tab: list of video links with external link icon
- Links tab: list of URLs with link icon and titles
- "Upload resource" button visible to company members/admins of the product's company

## 4. Frontend — Dashboard Upload Extension

The "My Manuals" tab gains a resource type selector:

```
[PDF] [Image] [Video] [Link]

PDF mode (current behavior unchanged):
  - Product create/select toggle
  - Title, description, tags, image
  - File picker for PDF
  - + MOSS indexing

Image/Video mode:
  - Product select (existing only)
  - Title field
  - File picker for image/video
  - Uploads to storage → creates resource entry

Link mode:
  - Product select (existing only)
  - URL input
  - Title input
  - Creates resource entry directly (no file upload)
```

## 5. File Ownership & Auth

- Resources inherit their product's company_id
- Company members and admins can add/remove resources for their company's products
- Admins can manage resources for any product
- Public can view resources on product detail page

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Product deleted | `ON DELETE CASCADE` removes all resources |
| File upload fails | Transaction rollback, no partial resource entry |
| Upload to deleted product | 404 from product lookup before any operation |
| Duplicate link | Allowed (same URL, different title) |
| Storage cleanup on delete | Storage file removal is best-effort (log warning on failure) |
| Moss 3-index limit | Still enforced only for PDF uploads (Moss indexing); image/video/link resources don't consume Moss indexes |

## Not In Scope

- Video transcoding or streaming (external links only)
- Image auto-generation of thumbnails
- Full-text search across non-PDF resources
- Resource versioning
