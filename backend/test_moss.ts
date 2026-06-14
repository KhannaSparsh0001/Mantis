import { MossClient } from "@moss-dev/moss";
import "dotenv/config";

async function main() {
  const client = new MossClient(process.env.MOSS_PROJECT_ID!, process.env.MOSS_PROJECT_KEY!);
  await client.createIndex("faqs", [
    { id: "1", text: "hello", metadata: {} }
  ]);
  const res = await client.query("faqs", "test");
  console.log("type:", typeof res);
  console.log("is array:", Array.isArray(res));
  console.log("keys:", Object.keys(res));
}
main().catch(console.error);
