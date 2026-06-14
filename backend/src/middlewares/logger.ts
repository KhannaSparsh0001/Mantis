import { Elysia } from 'elysia';

export const loggerMiddleware = (app: Elysia) => {
  return app
    .onRequest(({ request }) => {
      console.log('Incoming request:', request.method, request.url);
    })
    .onAfterResponse(({ request, set }) => {
      const status = set.status || 200;
      console.log('Response sent:', status, request.url);
    });
};

