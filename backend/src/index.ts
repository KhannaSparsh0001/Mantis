import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { ENV } from './config/env';
import { loggerMiddleware } from './middlewares/logger';
import { registerRoutes } from './routes/index';

export const app = new Elysia()
  .use(cors({ origin: ENV.FRONTEND_URL }))
  .use(loggerMiddleware)
  .use(registerRoutes)
  .listen(ENV.PORT);

console.log(`🚀 Server running at http://${app.server?.hostname}:${app.server?.port}`);
