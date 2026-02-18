import { FastifyInstance } from 'fastify';
import { register, getUserByApiKey } from '../services/auth.js';
import { assignNumber, releaseNumber, getAssignedNumbers } from '../services/number-pool.js';
import { sendSms, handleInboundSms, getMessages } from '../services/sms.js';
import { initiateMission, getCallResult, handleCallConnected, handleCallEnded } from '../services/voice-mission.js';
import { makeRetellCall, getRetellCallResult, handleRetellWebhook, createRetellAgent } from '../services/retell-agent.js';
import { createCheckoutSession, handleStripeWebhook, CREDIT_PACKAGES } from '../services/payments-stripe.js';
import { createSolanaPayment, checkPaymentStatus, getPaymentPackages } from '../services/payments-solana.js';
import { config } from '../config.js';

// Auth middleware
async function authenticate(request: any, reply: any) {
  const apiKey = request.headers['x-api-key'] as string;
  if (!apiKey) {
    reply.code(401).send({ error: 'Missing X-API-Key header' });
    return;
  }
  const user = await getUserByApiKey(apiKey);
  if (!user) {
    reply.code(401).send({ error: 'Invalid API key' });
    return;
  }
  request.user = user;
}

export async function registerRoutes(app: FastifyInstance) {
  // --- Auth ---
  app.post('/api/auth/register', async (request, reply) => {
    const { email } = request.body as { email: string };
    if (!email) return reply.code(400).send({ error: 'Email required' });
    try {
      const result = await register(email);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(409).send({ error: err.message });
    }
  });

  // --- Numbers ---
  app.get('/api/numbers', { preHandler: authenticate }, async (request) => {
    const nums = await getAssignedNumbers((request as any).user.id);
    return { numbers: nums };
  });

  app.post('/api/numbers/assign', { preHandler: authenticate }, async (request, reply) => {
    const { duration_hours } = (request.body as any) || {};
    try {
      const result = await assignNumber((request as any).user.id, duration_hours);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(503).send({ error: err.message });
    }
  });

  app.delete('/api/numbers/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await releaseNumber(id);
    return { success: true };
  });

  // --- Messages ---
  app.get('/api/messages/:numberId', { preHandler: authenticate }, async (request) => {
    const { numberId } = request.params as { numberId: string };
    const msgs = await getMessages(numberId);
    return { messages: msgs };
  });

  app.post('/api/sms/send', { preHandler: authenticate }, async (request, reply) => {
    const { number_id, to, message } = request.body as { number_id: string; to: string; message: string };
    if (!number_id || !to || !message) {
      return reply.code(400).send({ error: 'number_id, to, and message are required' });
    }
    try {
      const result = await sendSms(number_id, to, message);
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // --- Calls (Retell-powered) ---
  app.post('/api/calls', { preHandler: authenticate }, async (request, reply) => {
    const { to, mission, style, caller_name, context } = request.body as {
      to: string; mission: string; style?: string; caller_name?: string; context?: string;
    };
    if (!to || !mission) {
      return reply.code(400).send({ error: 'to and mission are required' });
    }

    // Pick a number from the user's assigned numbers, or use a pool number
    const userNums = await getAssignedNumbers((request as any).user.id);
    const fromNumber = userNums.length > 0
      ? userNums[0].phoneNumber
      : config.TWILIO_PHONE_NUMBERS[0]; // fallback to first pool number

    try {
      const result = await makeRetellCall({
        userId: (request as any).user.id,
        toNumber: to,
        fromNumber,
        missionText: mission,
        style,
        callerName: caller_name,
        context,
      });
      return reply.code(201).send(result);
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  app.get('/api/calls/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getRetellCallResult(id);
    if (!result) return reply.code(404).send({ error: 'Call not found' });
    return result;
  });

  // --- Admin: Create Retell Agent (one-time setup) ---
  app.post('/api/admin/create-agent', async (request, reply) => {
    try {
      const agent = await createRetellAgent();
      return reply.code(201).send({ agentId: agent.agent_id, message: 'Add this agent_id to RETELL_AGENT_ID in .env' });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // --- Balance ---
  app.get('/api/balance', { preHandler: authenticate }, async (request) => {
    return { credits: (request as any).user.credits };
  });

  // --- Credit Packages ---
  app.get('/api/credits/packages', async () => {
    return {
      stripe: CREDIT_PACKAGES,
      solana: getPaymentPackages(),
    };
  });

  // --- Stripe Payments ---
  app.post('/api/credits/buy/stripe', { preHandler: authenticate }, async (request, reply) => {
    const { packageId, successUrl, cancelUrl } = request.body as any;
    if (!packageId) return reply.code(400).send({ error: 'packageId required' });
    try {
      const result = await createCheckoutSession((request as any).user.id, packageId, successUrl, cancelUrl);
      return result;
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // --- Solana Payments ---
  app.post('/api/credits/buy/solana', { preHandler: authenticate }, async (request, reply) => {
    const { packageId } = request.body as any;
    if (!packageId) return reply.code(400).send({ error: 'packageId required' });
    try {
      const result = await createSolanaPayment((request as any).user.id, packageId);
      return result;
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  app.get('/api/credits/solana/status/:paymentId', { preHandler: authenticate }, async (request) => {
    const { paymentId } = request.params as { paymentId: string };
    return checkPaymentStatus(paymentId);
  });

  // --- Webhooks (Stripe) ---
  app.post('/api/webhooks/stripe', {
    config: { rawBody: true },
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;
    try {
      const result = await handleStripeWebhook(Buffer.from(request.body as string), signature);
      return { received: true, result };
    } catch (err: any) {
      return reply.code(400).send({ error: err.message });
    }
  });

  // --- Webhooks (Retell) ---
  app.post('/api/webhooks/retell', async (request, reply) => {
    await handleRetellWebhook(request.body);
    return { received: true };
  });

  // --- Webhooks (Twilio) ---
  app.post('/api/webhooks/sms', async (request, reply) => {
    const { From, To, Body } = request.body as { From: string; To: string; Body: string };
    await handleInboundSms(From, To, Body);
    reply.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  });

  app.post('/api/webhooks/voice', async (request, reply) => {
    const { callId } = request.query as { callId: string };
    if (!callId) return reply.code(400).send('Missing callId');
    try {
      const twiml = await handleCallConnected(callId);
      reply.type('text/xml').send(twiml);
    } catch (err: any) {
      reply.code(404).send(err.message);
    }
  });

  app.post('/api/webhooks/voice/status', async (request, reply) => {
    const { callId } = request.query as { callId: string };
    const { CallDuration } = request.body as { CallDuration?: string };
    if (callId) {
      await handleCallEnded(callId, CallDuration ? parseInt(CallDuration, 10) : undefined);
    }
    reply.code(204).send();
  });
}
