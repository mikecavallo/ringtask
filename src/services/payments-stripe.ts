import Stripe from 'stripe';
import { config } from '../config.js';
import { db, schema } from '../db/index.js';
import { addCredits } from './auth.js';

// Credit packages (amounts in US cents)
export const CREDIT_PACKAGES = [
  { id: 'credits_10', credits: 10, priceUsd: 100, label: '10 credits ($1.00)' },
  { id: 'credits_50', credits: 50, priceUsd: 400, label: '50 credits ($4.00)' },
  { id: 'credits_200', credits: 200, priceUsd: 1200, label: '200 credits ($12.00)' },
  { id: 'credits_1000', credits: 1000, priceUsd: 5000, label: '1000 credits ($50.00)' },
];

function getStripe(): Stripe {
  if (!config.STRIPE_SECRET_KEY) throw new Error('Stripe not configured');
  return new Stripe(config.STRIPE_SECRET_KEY);
}

export async function createCheckoutSession(userId: string, packageId: string, successUrl: string, cancelUrl: string) {
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!pkg) throw new Error(`Invalid package: ${packageId}`);
  if (!successUrl || !cancelUrl) throw new Error('successUrl and cancelUrl are required');

  const session = await getStripe().checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: `RingTask ${pkg.credits} Credits`, description: pkg.label },
        unit_amount: pkg.priceUsd,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, packageId, credits: String(pkg.credits) },
  });

  return { checkoutUrl: session.url, sessionId: session.id };
}

/**
 * Verify a Stripe webhook signature against the raw request body and credit the user
 * on `checkout.session.completed`. Each event ID is processed at most once, so
 * Stripe's retries cannot double-credit an account.
 */
export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
  if (!config.STRIPE_WEBHOOK_SECRET) throw new Error('Stripe webhook secret not configured');
  if (!signature) throw new Error('Missing stripe-signature header');

  const event = Stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);

  if (event.type !== 'checkout.session.completed') return { handled: false, type: event.type };

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status && session.payment_status !== 'paid') return { handled: false, type: event.type };

  const userId = session.metadata?.userId;
  const packageId = session.metadata?.packageId;
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
  if (!userId || !pkg) return { handled: false, type: event.type };

  const inserted = db.insert(schema.processedWebhooks)
    .values({ id: `stripe:${event.id}`, source: 'stripe', createdAt: new Date() })
    .onConflictDoNothing()
    .run();
  if (inserted.changes === 0) return { handled: false, duplicate: true, type: event.type };

  await addCredits(userId, pkg.credits);
  return { handled: true, type: event.type, userId, credits: pkg.credits };
}
