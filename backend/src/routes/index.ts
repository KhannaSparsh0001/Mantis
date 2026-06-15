import { Elysia } from 'elysia';
import { health } from './health';
import { userController } from '../controllers/user.controller';
import { productRoutes } from './product';
import { authRoutes } from './auth';
import { invitationRoutes } from './invitations';
import { companyRoutes } from './companies';
import { adminRoutes } from './admin';
import { resourceRoutes } from './resources';
import { conversationRoutes } from './conversations';

export const registerRoutes = (app: Elysia) => {
  app.get('/', () => 'Hello Elysia');
  app.use(health);
  app.use(userController);
  app.use(authRoutes);
  app.use(invitationRoutes);
  app.use(companyRoutes);
  app.use(adminRoutes);
  app.use(productRoutes);
  app.use(conversationRoutes);
  app.use(resourceRoutes);
  return app;
};
