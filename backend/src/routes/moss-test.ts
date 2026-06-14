import { Elysia } from 'elysia';
import { moss } from '../moss/client';

export const mossTestRoute = new Elysia()
  .get("/moss-test", async () => {
    await moss.createIndex("faqs", [
      {
        id: "doc1",
        text: "Track your order in your account.",
        metadata: { category: "shipping" },
      },
      {
        id: "doc2",
        text: "30-day return policy for most items.",
        metadata: { category: "returns" },
      },
    ]);
    await moss.loadIndex("faqs");
    const results = await moss.query("faqs", "return a damaged product", {
      topK: 3,
    });

    console.log(results);

    return results;
  });
