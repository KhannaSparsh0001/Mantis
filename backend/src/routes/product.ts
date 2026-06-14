// src/routes/product.ts
import { Elysia } from 'elysia';
import { moss } from '../moss/client.ts';

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
  .post('/api/diagnose', async ({ body }) => {
    const { productId, query } = body as { productId: string; query: string };

    try {
      // 1. Query MOSS for relevant manual contexts
      await moss.loadIndex(productId);
      const searchResults = await moss.query(productId, query, { topK: 3 });
      console.log("MOSS search results:", searchResults);
    } catch (error: any) {
      console.warn("⚠️ MOSS query failed (likely index not created yet):", error.message || error);
    }

    // 2. Feed searchResults + query to your AI model/agent logic
    // 3. Return the response, suggested actions, and manual citations
    return {
      text: "Based on the manual: ...",
      suggestedActions: ["Check charging port pin", "Reset BMS"],
      manualLinks: [{ name: "BMS Protection Mode", page: 22 }]
    };
  });