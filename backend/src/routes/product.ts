import { Elysia, t } from 'elysia';
import { moss, initMoss, getOrCreateSession, getSession, ensureIndexLoaded, queryProductIndexes, cleanupSession } from '../moss/client.ts';
import { chunkText } from '../moss/chunker.ts';
import { ENV } from '../config/env.ts';
import { PDFParse } from 'pdf-parse';
import { supabase } from '../config/supabase.ts';
import type { QueryResultDocumentInfo } from '@moss-dev/moss';
import { authDerive, requireCompanyMember, requireAnyAuth, optionalAuth } from '../middlewares/auth.ts';

async function callOpenCode(systemPrompt: string): Promise<any> {
  if (!ENV.OPENCODE_API_KEY) {
    return null;
  }

  const response = await fetch(
    `${ENV.OPENCODE_BASE_URL}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ENV.OPENCODE_API_KEY}`,
      },
      body: JSON.stringify({
        model: ENV.OPENCODE_MODEL,
        messages: [{ role: 'user', content: systemPrompt }],
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`OpenCode API returned status ${response.status}: ${await response.text()}`);
  }

  const resBody = await response.json();
  const textResponse = resBody.choices?.[0]?.message?.content;
  if (!textResponse) throw new Error('Empty response from OpenCode API');

  return JSON.parse(textResponse.trim());
}

export const productRoutes = new Elysia()
  .get('/products', async () => {
    try {
      const results = await moss.query('products', '*');
      return (results as any)?.matches ?? [];
    } catch {
      return [];
    }
  })
  .get('/api/products', async () => {
    const { data, error } = await supabase.from('products').select('*');
    if (error) {
      console.error('Failed to fetch products:', error);
      return [];
    }
    return data || [];
  })
  .guard({ as: 'scoped' }, app =>
    requireAnyAuth()(app)
      .get('/api/manuals', async () => {
        try {
          const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          return data || [];
        } catch (err: any) {
          console.error('Failed to fetch manuals:', err.message || err);
          return [];
        }
      })
  )
  .guard({ as: 'scoped' }, app =>
    app.use(authDerive)
      .guard({ as: 'scoped' }, app2 =>
        requireCompanyMember()(app2)
          .post('/api/products', async ({ body, user, set }) => {
        const { id, title, description, tags } = body;

        let companyId: string | null = null;
        if (user!.role !== 'admin') {
          const { data: memberships } = await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (memberships) {
            companyId = memberships.company_id;
          }
        }

        const { data: existing } = await supabase
          .from('products')
          .select('id')
          .eq('id', id)
          .maybeSingle();

        if (existing) {
          set.status = 409;
          return { error: 'A product with this ID already exists.' };
        }

        const { error } = await supabase
          .from('products')
          .insert({
            id,
            title: title || id,
            description: description || null,
            tags: tags || [],
            company_id: companyId,
          });

        if (error) {
          set.status = 400;
          return { error: error.message };
        }

        set.status = 201;
        return { success: true };
      }, {
        body: t.Object({
          id: t.String(),
          title: t.Optional(t.String()),
          description: t.Optional(t.String()),
          tags: t.Optional(t.Array(t.String())),
        }),
      })
      .post('/api/upload-manual', async ({ body, user, set }) => {
        const { productId, title, description, tags, file, image } = body;

        if (!file || file.type !== 'application/pdf') {
          set.status = 400;
          return { error: 'Invalid file type. Only PDF is supported.' };
        }

        let companyId: string | null = null;
        if (user!.role !== 'admin') {
          const { data: memberships } = await supabase
            .from('company_members')
            .select('company_id')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();

          if (!memberships) {
            set.status = 403;
            return { error: 'You must belong to a company to upload manuals.' };
          }
          companyId = memberships.company_id;
        }

        try {
          await initMoss();

          const pdfPath = `pdfs/${productId}-${Date.now()}.pdf`;
          const pdfBuffer = await file.arrayBuffer();
          const { error: pdfUploadError } = await supabase.storage.from('product-assets').upload(pdfPath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true,
          });
          if (pdfUploadError) throw new Error(`PDF Upload Failed: ${pdfUploadError.message}`);

          const { data: pdfPublicUrlData } = supabase.storage.from('product-assets').getPublicUrl(pdfPath);
          const pdfUrl = pdfPublicUrlData.publicUrl;

          let imageUrl = null;
          if (image) {
            const imagePath = `images/${productId}-${Date.now()}-${image.name}`;
            const imageBuffer = await image.arrayBuffer();
            const { error: imgUploadError } = await supabase.storage.from('product-assets').upload(imagePath, imageBuffer, {
              contentType: image.type,
              upsert: true,
            });
            if (imgUploadError) throw new Error(`Image Upload Failed: ${imgUploadError.message}`);

            const { data: imgPublicUrlData } = supabase.storage.from('product-assets').getPublicUrl(imagePath);
            imageUrl = imgPublicUrlData.publicUrl;
          }

          const parsedTags = tags ? tags.split(',').map((t: string) => t.trim()) : [];

          let chunks: Array<{ text: string; page: number; chunkIndex: number }> = [];
          try {
            console.log(`Parsing PDF file locally: ${file.name}...`);
            const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
            const textResult = await parser.getText();
            chunks = textResult.pages.flatMap((page: any) =>
              chunkText(page.text, page.num, title)
            );
          } catch (parseErr: any) {
            console.warn(`PDF parsing failed for ${file.name}: ${parseErr.message || parseErr}. Continuing without search indexing.`);
          }

          if (chunks.length === 0) {
            console.warn(`[upload-manual] No searchable content extracted from PDF for product ${productId}. Skipping MOSS indexing.`);
          } else {
            const docs = chunks.map(chunk => ({
              id: `${productId}-${chunk.page}-${chunk.chunkIndex}`,
              text: chunk.text,
              metadata: {
                productId: String(productId),
                page: String(chunk.page),
                chunkIndex: String(chunk.chunkIndex),
              },
            }));
            console.log(`Indexing ${docs.length} chunks in MOSS for product ${productId}...`);
            await moss.addDocs('manuals', docs, { upsert: true });
          }

          const { error: dbError } = await supabase.from('products').upsert({
            id: productId,
            title,
            description,
            tags: parsedTags,
            pdf_url: pdfUrl,
            image_url: imageUrl,
            status: 'Processed',
            company_id: companyId,
          });
          if (dbError) throw new Error(`DB Insert Failed: ${dbError.message}`);

          await supabase.from('product_resources').insert({
            product_id: productId,
            type: 'pdf',
            url: pdfUrl,
            title: title || file.name,
            size: file.size,
          }).then(({ error: resErr }) => {
            if (resErr) console.warn('Failed to insert product resource:', resErr.message);
          });

          console.log(`Successfully indexed and persisted ${file.name}`);
          return { success: true, message: `Successfully indexed ${title}` };
        } catch (err: any) {
          console.error(`Failed to index product ${productId}:`, err);
          set.status = 500;
          return { error: `Upload process failed: ${err.message || err}` };
        }
      }, {
        body: t.Object({
          productId: t.String(),
          title: t.String(),
          description: t.String(),
          tags: t.Optional(t.String()),
          file: t.File(),
          image: t.Optional(t.File()),
        }),
      })
      )
  )
  .guard({ as: 'scoped' }, app =>
    requireAnyAuth()(app)
      .put('/api/products/:id', async ({ params, body, user, set }) => {
        const { id } = params;
        const updates = body as Record<string, any>;

        const { data: product, error: findError } = await supabase
          .from('products')
          .select('company_id')
          .eq('id', id)
          .maybeSingle();

        if (findError || !product) {
          set.status = 404;
          return { error: 'Product not found.' };
        }

        if (product.company_id === null) {
          if (user!.role !== 'admin') {
            set.status = 403;
            return { error: 'Forbidden: Only admin can edit unassociated products.' };
          }
        } else {
          const { data: membership } = await supabase
            .from('company_members')
            .select('id')
            .eq('user_id', user!.id)
            .eq('company_id', product.company_id)
            .maybeSingle();

          if (!membership && user!.role !== 'admin') {
            set.status = 403;
            return { error: 'Forbidden: You do not belong to this product\'s company.' };
          }
        }

        const { error: updateError } = await supabase
          .from('products')
          .update(updates)
          .eq('id', id);

        if (updateError) {
          set.status = 400;
          return { error: updateError.message };
        }

        return { success: true };
      }, {
        params: t.Object({ id: t.String() }),
        body: t.Object({
          title: t.Optional(t.String()),
          description: t.Optional(t.String()),
          tags: t.Optional(t.Array(t.String())),
        }),
      })
      .delete('/api/products/:id', async ({ params, user, set }) => {
        const { id } = params;

        const { data: product, error: findError } = await supabase
          .from('products')
          .select('company_id')
          .eq('id', id)
          .maybeSingle();

        if (findError || !product) {
          set.status = 404;
          return { error: 'Product not found.' };
        }

        if (product.company_id === null) {
          if (user!.role !== 'admin') {
            set.status = 403;
            return { error: 'Forbidden: Only admin can delete unassociated products.' };
          }
        } else {
          const { data: membership } = await supabase
            .from('company_members')
            .select('id')
            .eq('user_id', user!.id)
            .eq('company_id', product.company_id)
            .maybeSingle();

          if (!membership && user!.role !== 'admin') {
            set.status = 403;
            return { error: 'Forbidden: You do not belong to this product\'s company.' };
          }
        }

        const { error: deleteError } = await supabase
          .from('products')
          .delete()
          .eq('id', id);

        if (deleteError) {
          set.status = 400;
          return { error: deleteError.message };
        }

        try {
          await initMoss();
          const allDocs = await moss.getDocs('manuals');
          const idsToDelete = allDocs
            .filter(d => d.metadata?.productId === id)
            .map(d => d.id);
          if (idsToDelete.length > 0) {
            await moss.deleteDocs('manuals', idsToDelete);
            console.log(`[delete] Cleaned up ${idsToDelete.length} MOSS chunks for product ${id}`);
          }
        } catch (mossErr: any) {
          console.warn(`[delete] MOSS cleanup failed for product ${id}:`, mossErr.message || mossErr);
        }

        return { success: true };
      }, {
        params: t.Object({ id: t.String() }),
      })
  )
  .guard({ as: 'scoped' }, app =>
    optionalAuth()(app)
      .post('/api/diagnose', async ({ body, set }) => {
        const { productId, query } = body as { productId: string; query: string };

        if (!query || !query.trim()) {
          set.status = 400;
          return { error: 'Query is required.' };
        }

        let promptContext = '';
        try {
          const result = await queryProductIndexes([productId], query, 3);
          promptContext = result.context;
        } catch (error: any) {
          console.warn('MOSS query failed (likely index not created yet):', error.message || error);
        }

        if (!ENV.OPENCODE_API_KEY) {
          return {
            text: 'It looks like the OpenCode API Key is not set in the environment. Based on the system\'s mock knowledge: Please check if the connection between the battery terminal and controller is tight.',
            suggestedActions: ['Inspect Fuse F3 (10A)', 'Check battery-to-controller connection', 'Reset BMS'],
            manualLinks: [{ name: 'BMS Protection Mode', page: 22 }, { name: 'Replacing the Fuse', page: 34 }],
          };
        }

        try {
          const parsed = await callOpenCode(`You are an expert technician and diagnostic assistant for products.
The user is troubleshooting the product: "${productId}".
User query: "${query}"

Here is the context extracted from the official product knowledge base (including manual, description, and tags):
---
${promptContext || 'No official knowledge context found for this product. Use general technical knowledge.'}
---

Provide a helpful, step-by-step diagnostic recommendation to narrow down the issue and inspect components safely.
You MUST output your response in JSON format matching this schema:
{
  "text": "Your step-by-step diagnostic text. Keep it technical, clear, and structured.",
  "suggestedActions": ["Action check item 1", "Action check item 2", ...],
  "manualLinks": [{"name": "Section Name or Manual Page Reference", "page": 12}, ...]
}

Return ONLY the raw JSON object. Do not wrap it in markdown code blocks or other text.`);

          return {
            text: parsed.text || 'Could not generate recommendation.',
            suggestedActions: parsed.suggestedActions || [],
            manualLinks: parsed.manualLinks || [],
          };
        } catch (openCodeError: any) {
          console.error('OpenCode API call failed:', openCodeError);
          return {
            text: `Error calling AI diagnostics assistant: ${openCodeError.message || openCodeError}. Returning mock fallback.`,
            suggestedActions: ['Check physical connections', 'Verify power source'],
            manualLinks: [{ name: 'General Troubleshooting Guide', page: 1 }],
          };
        }
      })
      .post('/api/ask', async ({ body, set }) => {
        const { query, sessionId: incomingSessionId, productIds } = body as {
          query: string;
          sessionId?: string;
          productIds?: string[];
        };

        if (!query || !query.trim()) {
          set.status = 400;
          return { error: 'Query is required.' };
        }

        let sessionId = incomingSessionId || '';
        let mossAvailable = false;

        try {
          const result = await getOrCreateSession(incomingSessionId);
          sessionId = result.sessionId;
          mossAvailable = true;
        } catch {
          sessionId = sessionId || `chat-fallback-${Date.now()}`;
        }

        let targetProductIds = productIds;
        if (!targetProductIds || targetProductIds.length === 0) {
          try {
            const { data } = await supabase.from('products').select('id');
            targetProductIds = (data || []).map((p: any) => p.id);
          } catch {
            targetProductIds = [];
          }
        }

        let mossContext = '';
        let sources: string[] = [];

        if (mossAvailable) {
          try {
            const entry = getSession(sessionId);
            if (entry) {
              await entry.session.addDocs([
                { id: `user-${Date.now()}`, text: `User asked: ${query}`, metadata: { role: 'user', type: 'message' } },
              ]);
            }
          } catch { }

          const [productResult, sessionResult] = await Promise.allSettled([
            queryProductIndexes(targetProductIds, query, 3),
            (() => {
              const entry = getSession(sessionId);
              if (entry) {
                return entry.session.query(query, { topK: 5 });
              }
              return Promise.resolve({ docs: [] });
            })(),
          ]);

          if (productResult.status === 'fulfilled') {
            mossContext = productResult.value.context;
            sources = productResult.value.sources;
          }

          let sessionContext = '';
          if (sessionResult.status === 'fulfilled') {
            const sessionResults = sessionResult.value;
            if (sessionResults?.docs?.length) {
              sessionContext = sessionResults.docs
                .filter((d: QueryResultDocumentInfo) => d.id !== 'system-prompt')
                .map((d: QueryResultDocumentInfo) => d.text)
                .join('\n');
            }
          }
        }

        if (!ENV.OPENCODE_API_KEY) {
          return {
            answer: 'The OpenCode API key is not configured. Please set OPENCODE_API_KEY in your .env file.',
            suggestedActions: [],
            relatedProducts: sources,
            sessionId,
            sources,
          };
        }

        try {
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

          if (mossAvailable) {
            try {
              const entry = getSession(sessionId);
              if (entry) {
                await entry.session.addDocs([
                  { id: `ai-${Date.now()}`, text: `AI responded: ${parsed.answer}`, metadata: { role: 'assistant', type: 'message' } },
                  { id: `conclusion-${Date.now()}`, text: `Diagnostic conclusion: ${parsed.answer}`, metadata: { role: 'assistant', type: 'conclusion' } },
                ]);
              }
            } catch { }
          }

          return {
            answer: parsed.answer || 'Could not generate an answer.',
            suggestedActions: parsed.suggestedActions || [],
            relatedProducts: parsed.relatedProducts || sources,
            sessionId,
            sources,
          };
        } catch (err: any) {
          console.error('Failed to process question:', err);
          set.status = 500;
          return { error: `Failed to process question: ${err.message || err}` };
        }
      }, {
        body: t.Object({
          query: t.String(),
          sessionId: t.Optional(t.String()),
          productIds: t.Optional(t.Array(t.String())),
        }),
      })
  )
  .post('/api/chat/end', async ({ body }) => {
    const { sessionId } = body as { sessionId: string };
    if (sessionId) {
      cleanupSession(sessionId);
    }
    return { success: true };
  });
