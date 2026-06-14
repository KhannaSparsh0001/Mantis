// src/middlewares/logger.ts

export const loggerMiddleware = (app: any) => {
  return app.use({
    before: (request: any) => {
      console.log('Incoming request:', request.method, request.url);
    },
    after: (response: any, request: any) => {
      console.log('Response sent:', response?.status, request.url);
    },
  });
};
