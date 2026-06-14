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
  });
