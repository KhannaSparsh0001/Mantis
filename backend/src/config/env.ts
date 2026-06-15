// Bun natively loads .env files automatically, so no need for dotenv package


export const ENV = {
  MOSS_PROJECT_ID: process.env.MOSS_PROJECT_ID || '',
  MOSS_PROJECT_KEY: process.env.MOSS_PROJECT_KEY || '',
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SECRET_API_KEY: process.env.SUPABASE_SECRET_API_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  PORT: Number(process.env.PORT) || 8000,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  OPENCODE_API_KEY: process.env.OPENCODE_API_KEY || '',
  OPENCODE_BASE_URL: process.env.OPENCODE_BASE_URL || 'https://opencode.ai/zen/v1',
  OPENCODE_MODEL: process.env.OPENCODE_MODEL || 'mimo-v2.5-free',
  AUTH_EMAIL_WHITELIST: process.env.AUTH_EMAIL_WHITELIST || '',
};

if (!ENV.MOSS_PROJECT_ID || !ENV.MOSS_PROJECT_KEY) {
  console.warn('⚠️ Moss AI credentials not set in .env');
}
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_SECRET_API_KEY) {
  console.warn('⚠️ Supabase credentials not set in .env');
}
if (!ENV.OPENCODE_API_KEY) {
  console.warn('⚠️ OpenCode API key not set in .env');
}
