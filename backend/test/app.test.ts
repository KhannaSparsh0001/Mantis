import { describe, expect, it } from "bun:test";
import { app } from "../src/index";

describe("Mantis API Server", () => {
  it("returns 200 OK for GET /health", async () => {
    const response = await app.handle(
      new Request("http://localhost/health")
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.status).toBe("ok");
    expect(data.timestamp).toBeDefined();
  });

  it("returns 200 OK for GET /api/products", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/products")
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0].id).toBe("xiaomi-scooter-4-pro");
  });

  it("returns 200 OK for POST /api/diagnose", async () => {
    const response = await app.handle(
      new Request("http://localhost/api/diagnose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: "xiaomi-scooter-4-pro",
          query: "scooter wont start",
        }),
      })
    );
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.text).toBeDefined();
    expect(Array.isArray(data.suggestedActions)).toBe(true);
    expect(Array.isArray(data.manualLinks)).toBe(true);
  }, 15000);

  it("returns 400 Bad Request for POST /api/upload-manual with invalid file type", async () => {
    const formData = new FormData();
    formData.append("productId", "xiaomi-scooter-4-pro");
    formData.append("file", new Blob(["dummy text content"], { type: "text/plain" }), "test.txt");

    const response = await app.handle(
      new Request("http://localhost/api/upload-manual", {
        method: "POST",
        body: formData,
      })
    );
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });
});
