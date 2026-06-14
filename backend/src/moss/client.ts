import { MossClient } from "@moss-dev/moss";
import { ENV } from "../config/env.ts";

export const moss = new MossClient(ENV.MOSS_PROJECT_ID, ENV.MOSS_PROJECT_KEY);

export async function listProducts(): Promise<any[]> {
  // Example: assuming a collection named "products" exists in Moss AI
  await moss.loadIndex("products");
  const results = await moss.query("products", "*"); // simple wildcard query
  return (results as any)?.matches ?? [];
}
