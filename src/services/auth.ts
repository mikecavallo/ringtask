import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { randomBytes } from 'crypto';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';

const { users } = schema;

export function generateApiKey(): string {
  return 'rt_' + randomBytes(24).toString('hex');
}

export async function register(email: string) {
  const existing = db.select().from(users).where(eq(users.email, email)).get();
  if (existing) throw new Error('Email already registered');

  const id = uuid();
  const apiKey = generateApiKey();

  db.insert(users)
    .values({
      id,
      apiKey,
      email,
      credits: config.NEW_USER_CREDITS,
      createdAt: new Date(),
    })
    .run();

  return { id, apiKey, credits: config.NEW_USER_CREDITS };
}

export async function getUserByApiKey(apiKey: string) {
  return db.select().from(users).where(eq(users.apiKey, apiKey)).get() ?? null;
}

export async function getUserById(userId: string) {
  return db.select().from(users).where(eq(users.id, userId)).get() ?? null;
}

export async function deductCredits(userId: string, amount: number, action: string, metadata?: Record<string, unknown>) {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  if (user.credits < amount) throw new Error('Insufficient credits');

  db.update(users)
    .set({ credits: user.credits - amount })
    .where(eq(users.id, userId))
    .run();

  db.insert(schema.usageLogs)
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
