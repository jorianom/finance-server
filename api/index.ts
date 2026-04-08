// Vercel serverless handler — @vercel/node usa esbuild para compilar todo desde source.
import type { IncomingMessage, ServerResponse } from 'http';
import { buildApp } from '../src/app.js';

let app: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!app) {
    app = buildApp();
    await app.ready();
  }
  return app;
}

export default async (req: IncomingMessage, res: ServerResponse) => {
  const fastify = await getApp();
  fastify.server.emit('request', req, res);
};
