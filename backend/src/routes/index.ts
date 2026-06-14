// src/routes/index.ts
import { Elysia } from 'elysia';
import { health } from './health';
import { userController } from '../controllers/user.controller';
import { productRoutes } from './product';
import { mossTestRoute } from './moss-test';

export const registerRoutes = (app: Elysia) => {
  app.get('/', () => 'Hello Elysia');
  app.use(health);
  app.use(userController);
  app.use(productRoutes);
  app.use(mossTestRoute);
  return app;
};
