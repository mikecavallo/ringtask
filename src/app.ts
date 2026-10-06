import Fastify, { type FastifyServerOptions } from 'fastify';
import formbody from '@fastify/formbody';
import { registerRoutes } from './api/routes.js';

/** Build the Fastify app without starting it (used by the server entry point and tests). */
export async function buildApp(opts: FastifyServerOptions = {}) {
  const app = Fastify(opts);
  await app.register(formbody); // Twilio webhooks are application/x-www-form-urlencoded
  await registerRoutes(app);
  return app;
}
