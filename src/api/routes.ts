import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { config } from '../config.js';
import { register, getUserByApiKey, type User } from '../services/auth.js';
import { assignNumber, releaseNumber, getAssignedNumbers } from '../services/number-pool.js';
import { sendSms, handleInboundSms, getMessages } from '../services/sms.js';
import { startMission, getCallResult, handleVoiceWebhook } from '../services/voice.js';
import { createRetellAgent } from '../providers/retell.js';
import { validateTwilioSignature } from '../providers/twilio.js';
import { createCheckoutSession, handleStripeWebhook, CREDIT_PACKAGES } from '../services/payments-stripe.js';
import { createSolanaPayment, checkPaymentStatus, getPaymentPackages } from '../services/payments-solana.js';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
  }
}

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));
const userOf = (request: FastifyRequest) => request.user as User;

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'];
  if (typeof apiKey !== 'string' || !apiKey) {
    return reply.code(401).send({ error: 'Missing X-API-Key header' });
  }
  const user = await getUserByApiKey(apiKey);
  if (!user) return reply.code(401).send({ error: 'Invalid API key' });
  request.user = user;
}

export async function registerRoutes(app: FastifyInstance) {
  app.get('/api/health', async () => ({ ok: true, mock: config.MOCK_PROVIDERS }));

  // --- Auth ---
  app.post('/api/auth/register', async (request, reply) => {
    const { email } = (request.body ?? {}) as { email?: string };
    if (!email) return reply.code(400).send({ error: 'Email required' });
    try {
      return reply.code(201).send(await register(email));
    } catch (err) {
      const msg = errorMessage(err);
      return reply.code(msg === 'Email already registered' ? 409 : 400).send({ error: msg });
    }
  });

  // --- Numbers ---
  app.get('/api/numbers', { preHandler: authenticate }, async (request) => {
    return { numbers: await getAssignedNumbers(userOf(request).id) };
  });

  app.post('/api/numbers/assign', { preHandler: authenticate }, async (request, reply) => {
    const { duration_hours } = (request.body ?? {}) as { duration_hours?: number };
    try {
      return reply.code(201).send(await assignNumber(userOf(request).id, duration_hours));
    } catch (err) {
      const msg = errorMessage(err);
      return reply.code(msg.startsWith('No numbers') ? 503 : 400).send({ error: msg });
    }
  });

  app.delete('/api/numbers/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await releaseNumber(userOf(request).id, id);
      return { success: true };
    } catch (err) {
      return reply.code(404).send({ error: errorMessage(err) });
    }
  });

  // --- Messages ---
  app.get('/api/messages/:numberId', { preHandler: authenticate }, async (request, reply) => {
    const { numberId } = request.params as { numberId: string };
    try {
      return { messages: await getMessages(userOf(request).id, numberId) };
    } catch (err) {
      return reply.code(404).send({ error: errorMessage(err) });
    }
  });

  app.post('/api/sms/send', { preHandler: authenticate }, async (request, reply) => {
    const { number_id, to, message } = (request.body ?? {}) as { number_id?: string; to?: string; message?: string };
    if (!number_id || !to || !message) {
      return reply.code(400).send({ error: 'number_id, to, and message are required' });
    }
    try {
      return reply.code(201).send(await sendSms(userOf(request).id, number_id, to, message));
    } catch (err) {
      return reply.code(400).send({ error: errorMessage(err) });
    }
  });

  // --- Voice calls (Retell) ---
  app.post('/api/calls', { preHandler: authenticate }, async (request, reply) => {
    const { to, mission, style, caller_name, context } = (request.body ?? {}) as {
      to?: string; mission?: string; style?: string; caller_name?: string; context?: string;
    };
    if (!to || !mission) return reply.code(400).send({ error: 'to and mission are required' });
    try {
      const result = await startMission({
        userId: userOf(request).id, toNumber: to, missionText: mission, style, callerName: caller_name, context,
      });
      return reply.code(201).send(result);
    } catch (err) {
      return reply.code(502).send({ error: errorMessage(err) });
    }
  });

  app.get('/api/calls/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getCallResult(userOf(request).id, id);
    if (!result) return reply.code(404).send({ error: 'Call not found' });
    return result;
  });

  // --- Admin: create the Retell agent (one-time setup, requires ADMIN_API_KEY) ---
  app.post('/api/admin/create-agent', async (request, reply) => {
    if (!config.ADMIN_API_KEY || request.headers['x-admin-key'] !== config.ADMIN_API_KEY) {
      return reply.code(403).send({ error: 'Forbidden' });
    }
    try {
      const agent = await createRetellAgent();
      return reply.code(201).send({ agentId: agent.agent_id, message: 'Set RETELL_AGENT_ID to this value' });
    } catch (err) {
      return reply.code(502).send({ error: errorMessage(err) });
    }
  });

  // --- Balance & credits ---
  app.get('/api/balance', { preHandler: authenticate }, async (request) => ({ credits: userOf(request).credits }));

  app.get('/api/credits/packages', async () => ({ stripe: CREDIT_PACKAGES, solana: getPaymentPackages() }));

  app.post('/api/credits/buy/stripe', { preHandler: authenticate }, async (request, reply) => {
    const { packageId, successUrl, cancelUrl } = (request.body ?? {}) as Record<string, string>;
    if (!packageId) return reply.code(400).send({ error: 'packageId required' });
    try {
      return await createCheckoutSession(userOf(request).id, packageId, successUrl, cancelUrl);
    } catch (err) {
      return reply.code(400).send({ error: errorMessage(err) });
    }
  });

  app.post('/api/credits/buy/solana', { preHandler: authenticate }, async (request, reply) => {
    const { packageId } = (request.body ?? {}) as Record<string, string>;
    if (!packageId) return reply.code(400).send({ error: 'packageId required' });
    try {
      return await createSolanaPayment(userOf(request).id, packageId);
    } catch (err) {
      return reply.code(400).send({ error: errorMessage(err) });
    }
  });

  app.get('/api/credits/solana/status/:paymentId', { preHandler: authenticate }, async (request) => {
    const { paymentId } = request.params as { paymentId: string };
    return checkPaymentStatus(paymentId);
  });

  // --- Webhooks ---
  // Stripe signs the exact raw bytes, so this route gets its own scope with a raw-body JSON parser.
  await app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_req, body, done) => done(null, body));
    scope.post('/api/webhooks/stripe', async (request, reply) => {
      try {
        const result = await handleStripeWebhook(request.body as Buffer, request.headers['stripe-signature'] as string | undefined);
        return { received: true, result };
      } catch (err) {
        return reply.code(400).send({ error: errorMessage(err) });
      }
    });
  });

  app.post('/api/webhooks/retell', async (request, reply) => {
    try {
      return { received: true, ...(await handleVoiceWebhook(request.body)) };
    } catch (err) {
      return reply.code(502).send({ error: errorMessage(err) });
    }
  });

  app.post('/api/webhooks/sms', async (request, reply) => {
    const params = (request.body ?? {}) as Record<string, string>;
    if (!config.MOCK_PROVIDERS && config.TWILIO_VALIDATE_WEBHOOKS) {
      const url = `${config.BASE_URL.replace(/\/$/, '')}${request.url}`;
      const signature = request.headers['x-twilio-signature'] as string | undefined;
      if (!config.BASE_URL || !validateTwilioSignature(signature, url, params)) {
        return reply.code(403).send({ error: 'Invalid Twilio signature' });
      }
    }
    const { From, To, Body } = params;
    if (From && To && typeof Body === 'string') await handleInboundSms(From, To, Body);
    return reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });
}
