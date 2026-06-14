import { Elysia } from "elysia";
import { MossClient } from "@moss-dev/moss";

const client = new MossClient(
    process.env.MOSS_PROJECT_ID!,
    process.env.MOSS_PROJECT_KEY!,
);

const app = new Elysia()
    .get("/moss-test", async () => {
        await client.createIndex("faqs", [
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
        await client.loadIndex("faqs");
        const results = await client.query("faqs", "return a damaged product", {
            topK: 3,
        });

        console.log(results);

        return results;
    })
    .listen(8000);
