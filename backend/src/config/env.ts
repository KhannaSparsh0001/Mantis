import { config } from 'dotenv';

// Load .env file (ignore if not present in production)
config();

export const ENV = {
  MOSS_PROJECT_ID: process.env.MOSS_PROJECT_ID ?? '',
  MOSS_PROJECT_KEY: process.env.MOSS_PROJECT_KEY ?? '',
  TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL ?? '',
  TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ?? '',
  PORT: process.env.PORT ? Number(process.env.PORT) : 8000,
  FRONTEND_URL: process.env.FRONTEND_URL ?? 'http://localhost:3000',
};

if (!ENV.MOSS_PROJECT_ID || !ENV.MOSS_PROJECT_KEY) {
  console.warn('⚠️ Moss AI credentials not set in .env');
}
if (!ENV.TURSO_DATABASE_URL) {
  console.warn('⚠️ Turso DB URL not set in .env');
}
