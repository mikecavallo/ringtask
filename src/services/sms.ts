import { eq, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';
import { getSmsProvider } from '../providers/index.js';
import { deductCredits, getUserById } from './auth.js';
import { getOwnedNumber } from './number-pool.js';

const { messages, numbers } = schema;

export const E164_RE = /^\+[1-9]\d{6,14}$/;
export const MAX_SMS_LENGTH = 1600;

export interface SmsResult {
  messageId: string;
  status: string;
  mock: boolean;
}

export async function sendSms(userId: string, numberId: string, to: string, body: string): Promise<SmsResult> {
  if (!E164_RE.test(to)) throw new Error('`to` must be an E.164 phone number, e.g. +15551234567');
  if (!body || body.length > MAX_SMS_LENGTH) throw new Error(`message must be 1-${MAX_SMS_LENGTH} characters`);

  const number = await getOwnedNumber(userId, numberId);
  if (!number) throw new Error(`Number ${numberId} is not assigned to you`);

  const user = await getUserById(userId);
  if (!user || user.credits < config.CREDITS_PER_SMS) throw new Error('Insufficient credits');

  const provider = getSmsProvider();
  const sent = await provider.send({ from: number.phoneNumber, to, body });

  const messageId = uuid();
  db.insert(messages)
    .values({ id: messageId, numberId, direction: 'out', from: number.phoneNumber, to, body, createdAt: new Date() })
    .run();

  await deductCredits(userId, config.CREDITS_PER_SMS, 'sms_send', {
    messageId, providerMessageId: sent.providerMessageId, to, mock: sent.mock,
  });

  if (sent.mock) {
    // Mock mode only: simulate a reply so the inbound path can be demoed end to end.
    await handleInboundSms(to, number.phoneNumber, `[mock auto-reply] Received: "${body}"`);
  }

  return { messageId, status: sent.status, mock: sent.mock };
}

export async function handleInboundSms(from: string, to: string, body: string): Promise<string | null> {
  const number = db.select().from(numbers).where(eq(numbers.phoneNumber, to)).get();
  if (!number) return null;

  const messageId = uuid();
  db.insert(messages)
    .values({ id: messageId, numberId: number.id, direction: 'in', from, to, body, createdAt: new Date() })
    .run();
  return messageId;
}

/** Messages for a number the user currently holds. */
export async function getMessages(userId: string, numberId: string, limit = 50) {
  const number = await getOwnedNumber(userId, numberId);
  if (!number) throw new Error(`Number ${numberId} is not assigned to you`);

  return db.select().from(messages)
    .where(eq(messages.numberId, numberId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .all();
}
