import { eq, sql, and, gte } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { randomBytes } from 'crypto';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';

const { users, usageLogs } = schema;

export type User = typeof users.$inferSelect;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const DEMO_USER_EMAIL = 'demo@ringtask.local';

export function generateApiKey(): string {
  return 'rt_' + randomBytes(24).toString('hex');
}

export async function register(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!EMAIL_RE.test(normalized)) throw new Error('Invalid email address');

  const existing = db.select().from(users).where(eq(users.email, normalized)).get();
  if (existing) throw new Error('Email already registered');

  const id = uuid();
  const apiKey = generateApiKey();
  db.insert(users)
    .values({ id, apiKey, email: normalized, credits: config.NEW_USER_CREDITS, createdAt: new Date() })
    .run();

  return { id, apiKey, credits: config.NEW_USER_CREDITS };
}

export async function getUserByApiKey(apiKey: string): Promise<User | null> {
  if (!apiKey) return null;
  return db.select().from(users).where(eq(users.apiKey, apiKey)).get() ?? null;
}

export async function getUserById(userId: string): Promise<User | null> {
  return db.select().from(users).where(eq(users.id, userId)).get() ?? null;
}

/** Local demo user for mock mode. Never used when real providers are configured. */
export async function getOrCreateDemoUser(): Promise<User> {
  const existing = db.select().from(users).where(eq(users.email, DEMO_USER_EMAIL)).get();
  if (existing) return existing;
  await register(DEMO_USER_EMAIL);
  return db.select().from(users).where(eq(users.email, DEMO_USER_EMAIL)).get()!;
}

function logUsage(userId: string, action: string, amount: number, metadata?: Record<string, unknown>) {
  db.insert(usageLogs)
    .values({
      id: uuid(),
      userId,
      action,
      creditsUsed: amount,
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date(),
    })
    .run();
}

/** Atomically deduct credits; throws if the balance is insufficient. */
export async function deductCredits(userId: string, amount: number, action: string, metadata?: Record<string, unknown>) {
  const result = db.update(users)
    .set({ credits: sql`${users.credits} - ${amount}` })
    .where(and(eq(users.id, userId), gte(users.credits, amount)))
    .run();
  if (result.changes === 0) {
    const user = await getUserById(userId);
    throw new Error(user ? 'Insufficient credits' : 'User not found');
  }
  logUsage(userId, action, amount, metadata);
}

/**
 * Charge for usage that already happened (e.g. a finished call). The balance is floored
 * at zero rather than rejecting, since the provider cost has already been incurred.
 * Returns the amount actually charged.
 */
export async function chargeUsage(userId: string, amount: number, action: string, metadata?: Record<string, unknown>): Promise<number> {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  const charged = Math.min(amount, Math.max(user.credits, 0));
  db.update(users).set({ credits: sql`${users.credits} - ${charged}` }).where(eq(users.id, userId)).run();
  logUsage(userId, action, charged, { ...metadata, billed: amount });
  return charged;
}

export async function addCredits(userId: string, amount: number) {
  const result = db.update(users)
    .set({ credits: sql`${users.credits} + ${amount}` })
    .where(eq(users.id, userId))
    .run();
  if (result.changes === 0) throw new Error('User not found');
}
