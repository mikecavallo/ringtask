import Stripe from 'stripe';
import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const stripe = config.STRIPE_SECRET_KEY
  ? new Stripe(config.STRIPE_SECRET_KEY)
  : null;

// Credit packages
export const CREDIT_PACKAGES = [
  { id: 'credits_10', credits: 10, priceUsd: 100, label: '10 credits — $1.00' },
  { id: 'credits_50', credits: 50, priceUsd: 400, label: '50 credits — $4.00' },
  { id: 'credits_200', credits: 200, priceUsd: 1200, label: '200 credits — $12.00' },
  { id: 'credits_1000', credits: 1000, priceUsd: 5000, label: '1000 credits — $50.00' },
];

export async function createCheckoutSession(userId: string, packageId: string, successUrl: string, cancelUrl: string) {
  if (!stripe) throw new Error('Stripe not configured');

  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) throw new Error(`Invalid package: ${packageId}`);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `RingTask ${pkg.credits} Credits`,
          description: pkg.label,
        },
        unit_amount: pkg.priceUsd,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: successUrl || 'https://ringtask.ai/success',
    cancel_url: cancelUrl || 'https://ringtask.ai/cancel',
    metadata: {
      userId,
      packageId,
      credits: String(pkg.credits),
    },
  });

  return { checkoutUrl: session.url, sessionId: session.id };
}

export async function handleStripeWebhook(payload: Buffer, signature: string) {
  if (!stripe) throw new Error('Stripe not configured');

  const webhookSecret = config.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('Stripe webhook secret not configured');

  const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const credits = parseInt(session.metadata?.credits || '0', 10);

    if (userId && credits > 0) {
      await addCredits(userId, credits);
      console.log(`💳 Stripe: Added ${credits} credits to user ${userId}`);
      return { userId, credits, paymentId: session.payment_intent };
    }
  }

  return null;
}

async function addCredits(userId: string, amount: number) {
  const db = getDb();
  const user = db.select().from(users).where(eq(users.id, userId)).get();
  if (!user) throw new Error('User not found');
  db.update(users)
    .set({ credits: user.credits + amount })
    .where(eq(users.id, userId))
    .run();
}
