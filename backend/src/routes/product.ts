// src/routes/product.ts
import { Elysia, t } from 'elysia';
import { moss } from '../moss/client.ts';
import { ENV } from '../config/env.ts';
import { PDFParse } from 'pdf-parse';

export const productRoutes = new Elysia()
  .get('/products', async () => {
    // Ensure the 'products' index is loaded; adjust index name as needed
    await moss.loadIndex('products');
    const results = await moss.query('products', '*');
    // Return the matched documents (or empty array)
    return (results as any)?.matches ?? [];
  })
  .get('/api/products', () => {
    return [
      { id: "xiaomi-scooter-4-pro", name: "Xiaomi Mi Electric Scooter 4 Pro", category: "Electric Scooters" }
    ];
  })
  .post('/api/upload-manual', async ({ body, set }) => {
    const { productId, file } = body;

    if (!file || file.type !== 'application/pdf') {
      set.status = 400;
      return { error: 'Invalid file type. Only PDF is supported.' };
    }

    try {
      // Check if the index already exists in MOSS.
      // If it exists, delete it first to ensure a clean state before recreate.
      try {
        const indexes = await moss.listIndexes();
        const exists = indexes.some((idx: any) => idx.name === productId);
        if (exists) {
          console.log(`Index ${productId} already exists. Deleting it before recreating...`);
          await moss.deleteIndex(productId);
        }
      } catch (checkErr: any) {
        console.warn(`Warning checking/deleting index:`, checkErr.message || checkErr);
      }

      console.log(`Parsing PDF file locally: ${file.name}...`);
      const fileBuffer = await file.arrayBuffer();
      const parser = new PDFParse({ data: new Uint8Array(fileBuffer) });
      const textResult = await parser.getText();

      const docs = textResult.pages.map(page => ({
        id: `page-${page.num}`,
        text: page.text
      }));

      console.log(`Indexing ${docs.length} extracted pages in MOSS for product ${productId}...`);
      await moss.createIndex(productId, docs);
      console.log(`Successfully indexed ${file.name}`);
      return { success: true, message: `Successfully indexed ${file.name}` };
    } catch (err: any) {
      console.error(`Failed to index file ${file.name}:`, err);
      set.status = 500;
      return { error: `MOSS indexing failed: ${err.message || err}` };
    }
  }, {
    body: t.Object({
      productId: t.String(),
      file: t.File()
    })
  })
  .post('/api/diagnose', async ({ body }) => {
    const { productId, query } = body as { productId: string; query: string };

    let promptContext = "";
    try {
      // 1. Query MOSS for relevant manual contexts
      await moss.loadIndex(productId);
      const searchResults = await moss.query(productId, query, { topK: 3 });
      console.log("MOSS search results:", searchResults);
      if (searchResults && Array.isArray(searchResults.docs)) {
        promptContext = searchResults.docs.map(doc => doc.text).join("\n\n");
      }
    } catch (error: any) {
      console.warn("⚠️ MOSS query failed (likely index not created yet):", error.message || error);
    }

    // 2. Call the Google Gemini API to get diagnostic steps
    if (!ENV.GEMINI_API_KEY || process.env.NODE_ENV === 'test') {
      console.warn("⚠️ GEMINI_API_KEY is not set or running in test mode. Returning fallback mock response.");
      return {
        text: "It looks like the Gemini API Key is not set in the environment. Based on the system's mock knowledge: Please check if the connection between the battery terminal and controller is tight.",
        suggestedActions: ["Inspect Fuse F3 (10A)", "Check battery-to-controller connection", "Reset BMS"],
        manualLinks: [{ name: "BMS Protection Mode", page: 22 }, { name: "Replacing the Fuse", page: 34 }]
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": ENV.GEMINI_API_KEY,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an expert technician and diagnostic assistant for products.
The user is troubleshooting the product: "${productId}".
User query: "${query}"

Here is the context extracted from the official product manual:
---
${promptContext || "No official manual context found for this product. Use general technical knowledge."}
---

Provide a helpful, step-by-step diagnostic recommendation to narrow down the issue and inspect components safely.
You MUST output your response in JSON format matching this schema:
{
  "text": "Your step-by-step diagnostic text. Keep it technical, clear, and structured.",
  "suggestedActions": ["Action check item 1", "Action check item 2", ...],
  "manualLinks": [{"name": "Section Name or Manual Page Reference", "page": 12}, ...]
}

Return ONLY the raw JSON object. Do not wrap it in markdown code blocks or other text.`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API returned status ${response.status}: ${await response.text()}`);
      }

      const resBody = await response.json();
      const textResponse = resBody.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error("Empty response from Gemini API");
      }

      const parsed = JSON.parse(textResponse.trim());
      return {
        text: parsed.text || "Could not generate recommendation.",
        suggestedActions: parsed.suggestedActions || [],
        manualLinks: parsed.manualLinks || [],
      };
    } catch (geminiError: any) {
      console.error("Gemini API call failed:", geminiError);
      return {
        text: `Error calling AI diagnostics assistant: ${geminiError.message || geminiError}. Returning mock fallback.`,
        suggestedActions: ["Check physical connections", "Verify power source"],
        manualLinks: [{ name: "General Troubleshooting Guide", page: 1 }],
      };
    }
  });