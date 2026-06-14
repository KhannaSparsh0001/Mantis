// src/controllers/user.controller.ts
import { Elysia } from 'elysia';
import { userService } from '../services/user.service';

export const userController = new Elysia()
  .get('/users', async () => {
    const users = await userService.getAll();
    return users;
  })
  .post('/users', async ({ body }) => {
    const newUser = await userService.create(body);
    return newUser;
  });
