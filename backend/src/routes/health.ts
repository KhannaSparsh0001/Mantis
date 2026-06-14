// src/routes/health.ts
import { Elysia } from 'elysia';

export const health = new Elysia().get('/health', () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});
