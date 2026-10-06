import { eq, and, lte } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';

const { numbers } = schema;

export type PoolNumber = typeof numbers.$inferSelect;

export interface AssignedNumber {
  numberId: string;
  phoneNumber: string;
  expiresAt: Date;
}

export async function assignNumber(userId: string, durationHours?: number): Promise<AssignedNumber> {
  const hours = durationHours ?? config.DEFAULT_ASSIGN_HOURS;
  if (!Number.isFinite(hours) || hours <= 0 || hours > config.MAX_ASSIGN_HOURS) {
    throw new Error(`duration_hours must be between 0 and ${config.MAX_ASSIGN_HOURS}`);
  }
  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);

  // Retry a few times in case another request claims the same row first.
  for (let attempt = 0; attempt < 5; attempt++) {
    const available = db.select().from(numbers).where(eq(numbers.status, 'available')).limit(1).get();
    if (!available) break;

    const claimed = db.update(numbers)
      .set({ status: 'assigned', assignedTo: userId, assignedAt: now, expiresAt, cooldownUntil: null })
      .where(and(eq(numbers.id, available.id), eq(numbers.status, 'available')))
      .run();

    if (claimed.changes === 1) {
      return { numberId: available.id, phoneNumber: available.phoneNumber, expiresAt };
    }
  }
  throw new Error('No numbers available in the pool');
}

/** Returns the number if it is currently assigned to this user, otherwise null. */
export async function getOwnedNumber(userId: string, numberId: string): Promise<PoolNumber | null> {
  return db.select().from(numbers)
    .where(and(eq(numbers.id, numberId), eq(numbers.status, 'assigned'), eq(numbers.assignedTo, userId)))
    .get() ?? null;
}

function moveToCooldown(numberId: string) {
  const cooldownUntil = new Date(Date.now() + config.COOLDOWN_HOURS * 60 * 60 * 1000);
  db.update(numbers)
    .set({ status: 'cooldown', assignedTo: null, assignedAt: null, expiresAt: null, cooldownUntil })
    .where(eq(numbers.id, numberId))
    .run();
}

/** Release a number the user holds. Throws if the user does not hold it. */
export async function releaseNumber(userId: string, numberId: string): Promise<void> {
  const owned = await getOwnedNumber(userId, numberId);
  if (!owned) throw new Error(`Number ${numberId} is not assigned to you`);
  moveToCooldown(numberId);
}

/** Expire overdue assignments and return cooled-down numbers to the pool. */
export async function expireNumbers(now = new Date()): Promise<number> {
  const expired = db.select().from(numbers)
    .where(and(eq(numbers.status, 'assigned'), lte(numbers.expiresAt, now)))
    .all();
  for (const num of expired) moveToCooldown(num.id);

  db.update(numbers)
    .set({ status: 'available', cooldownUntil: null })
    .where(and(eq(numbers.status, 'cooldown'), lte(numbers.cooldownUntil, now)))
    .run();

  return expired.length;
}

export async function getAssignedNumbers(userId: string) {
  return db.select().from(numbers)
    .where(and(eq(numbers.status, 'assigned'), eq(numbers.assignedTo, userId)))
    .all();
}

export async function seedNumbers(phoneNumbers: string[]): Promise<number> {
  let added = 0;
  for (const phoneNumber of phoneNumbers) {
    const existing = db.select().from(numbers).where(eq(numbers.phoneNumber, phoneNumber)).get();
    if (!existing) {
      db.insert(numbers).values({ id: uuid(), phoneNumber, status: 'available' }).run();
      added++;
    }
  }
  return added;
}

/** Fictional 555-01xx numbers used only in mock mode. */
export const MOCK_POOL_NUMBERS = ['+15550100001', '+15550100002', '+15550100003'];

/** Any number in the pool, used as a fallback caller ID. */
export async function anyPoolNumber(): Promise<string | null> {
  const row = db.select().from(numbers).limit(1).get();
  return row?.phoneNumber ?? null;
}
