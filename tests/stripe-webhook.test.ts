import { beforeEach, describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { config } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { createUser, credits, resetDb } from './helpers.js';

const SECRET = 'whsec_test_secret';

function checkoutEvent(userId: string, id = 'evt_1') {
  return JSON.stringify({
    id,
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_1', object: 'checkout.session', payment_status: 'paid', metadata: { userId, packageId: 'credits_50', credits: '50' } } },
  });
}

const sign = (payload: string, secret = SECRET) => Stripe.webhooks.generateTestHeaderString({ payload, secret });

describe('Stripe webhook verification', () => {
  beforeEach(() => {
    resetDb();
    config.STRIPE_WEBHOOK_SECRET = SECRET;
  });

  async function post(payload: string, signature?: string) {
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST', url: '/api/webhooks/stripe', payload,
      headers: { 'content-type': 'application/json', ...(signature ? { 'stripe-signature': signature } : {}) },
    });
    await app.close();
    return res;
  }

  it('credits the purchased package for a correctly signed event', async () => {
    const user = await createUser();
    const payload = checkoutEvent(user.id);
    const res = await post(payload, sign(payload));
    expect(res.statusCode).toBe(200);
    expect(res.json().result).toMatchObject({ handled: true, credits: 50 });
    expect(await credits(user.id)).toBe(150);
  });

  it('processes a redelivered event only once', async () => {
    const user = await createUser();
    const payload = checkoutEvent(user.id);
    await post(payload, sign(payload));
    const again = await post(payload, sign(payload));
    expect(again.json().result).toMatchObject({ duplicate: true });
    expect(await credits(user.id)).toBe(150);
  });

  it('rejects missing, wrong-secret, and tampered signatures', async () => {
    const user = await createUser();
    const payload = checkoutEvent(user.id);

    expect((await post(payload)).statusCode).toBe(400);
    expect((await post(payload, sign(payload, 'whsec_wrong'))).statusCode).toBe(400);
    const tampered = payload.replace('credits_50', 'credits_1000');
    expect((await post(tampered, sign(payload))).statusCode).toBe(400);
    expect(await credits(user.id)).toBe(100);
  });

  it('refuses all webhooks when no secret is configured', async () => {
    config.STRIPE_WEBHOOK_SECRET = '';
    const user = await createUser();
    const payload = checkoutEvent(user.id);
    expect((await post(payload, sign(payload))).statusCode).toBe(400);
  });
});
