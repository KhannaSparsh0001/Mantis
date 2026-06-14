import { createClient } from "@libsql/client";
import { ENV } from "./env.ts";

const localClient = createClient({
  url: "file:mantis.db"
});

let remoteClient: ReturnType<typeof createClient> | null = null;
if (process.env.NODE_ENV !== 'test' && ENV.TURSO_DATABASE_URL && ENV.TURSO_AUTH_TOKEN) {
  try {
    remoteClient = createClient({
      url: ENV.TURSO_DATABASE_URL,
      authToken: ENV.TURSO_AUTH_TOKEN
    });
  } catch (err) {
    console.warn("⚠️ Failed to create remote Turso client, using local SQLite:", err);
  }
}

export const db = {
  execute: async (stmt: any, params?: any) => {
    if (remoteClient) {
      try {
        return await remoteClient.execute(stmt, params);
      } catch (err: any) {
        console.warn("⚠️ Remote database operation failed, falling back to local SQLite:", err.message || err);
        // If it's a 401 or token issue, disable remote client to prevent further slow retries
        if (err.message && (err.message.includes("401") || err.message.includes("Unauthorized") || err.message.includes("invalid JWT"))) {
          console.warn("⚠️ Disabling remote client due to auth error.");
          remoteClient = null;
        }
        return await localClient.execute(stmt, params);
      }
    }
    return await localClient.execute(stmt, params);
  }
};

// Initialize the database tables
export async function initDb() {
  try {
    console.log("Initializing database tables...");
    await db.execute(`
      CREATE TABLE IF NOT EXISTS manuals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        productId TEXT NOT NULL,
        status TEXT NOT NULL,
        date TEXT NOT NULL
      );
    `);

    // Check if we already have seed data
    const res = await db.execute("SELECT COUNT(*) as count FROM manuals;");
    const count = (res.rows[0] as any)?.count ?? 0;

    if (count === 0) {
      console.log("Seeding initial manuals...");
      await db.execute("INSERT INTO manuals (name, productId, status, date) VALUES ('Ninebot MAX G2 Manual.pdf', 'ninebot-max-g2', 'Processed', 'Uploaded May 15, 2024');");
      await db.execute("INSERT INTO manuals (name, productId, status, date) VALUES ('Sony WH-1000XM5 Guide.pdf', 'sony-wh1000xm5', 'Processed', 'Uploaded May 14, 2024');");
      await db.execute("INSERT INTO manuals (name, productId, status, date) VALUES ('Dyson V15 Manual.pdf', 'dyson-v15', 'Processed', 'Uploaded May 13, 2024');");
      console.log("Database seeded successfully!");
    }
  } catch (err: any) {
    console.error("Failed to initialize database:", err.message || err);
  }
}
