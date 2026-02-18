import { eq, and, lte } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';

const { numbers } = schema;

export interface AssignedNumber {
  numberId: string;
  phoneNumber: string;
  expiresAt: Date;
}

export async function assignNumber(userId: string, durationHours?: number): Promise<AssignedNumber> {
  const hours = durationHours ?? config.DEFAULT_ASSIGN_HOURS;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const available = db
    .select()
    .from(numbers)
    .where(eq(numbers.status, 'available'))
    .limit(1)
    .get();

  if (!available) {
    throw new Error('No numbers available in the pool');
  }

  db.update(numbers)
    .set({
      status: 'assigned',
      assignedTo: userId,
      assignedAt: now,
      expiresAt,
    })
    .where(eq(numbers.id, available.id))
    .run();

  return {
    numberId: available.id,
    phoneNumber: available.phoneNumber,
    expiresAt,
  };
}

export async function releaseNumber(numberId: string): Promise<void> {
  const cooldownUntil = new Date(Date.now() + config.COOLDOWN_HOURS * 60 * 60 * 1000);

  db.update(numbers)
    .set({
      status: 'cooldown',
      assignedTo: null,
      assignedAt: null,
      expiresAt: null,
      cooldownUntil,
    })
    .where(eq(numbers.id, numberId))
    .run();
}

export async function expireNumbers(): Promise<number> {
  const now = new Date();

  // Release expired assignments
  const expired = db
    .select()
    .from(numbers)
    .where(and(eq(numbers.status, 'assigned'), lte(numbers.expiresAt, now)))
    .all();

  for (const num of expired) {
    await releaseNumber(num.id);
  }

  // Move cooldown numbers back to available
  db.update(numbers)
    .set({
      status: 'available',
      cooldownUntil: null,
    })
    .where(and(eq(numbers.status, 'cooldown'), lte(numbers.cooldownUntil, now)))
    .run();

  return expired.length;
}

export async function getAssignedNumbers(userId: string) {
  return db
    .select()
    .from(numbers)
    .where(and(eq(numbers.status, 'assigned'), eq(numbers.assignedTo, userId)))
    .all();
}

export async function seedNumbers(phoneNumbers: string[]): Promise<void> {
  for (const phoneNumber of phoneNumbers) {
    const existing = db
      .select()
      .from(numbers)
      .where(eq(numbers.phoneNumber, phoneNumber))
      .get();

    if (!existing) {
      db.insert(numbers)
        .values({ id: uuid(), phoneNumber, status: 'available' })
        .run();
    }
  }
}
