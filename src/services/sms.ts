import { eq, desc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import Twilio from 'twilio';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';

const { messages, numbers } = schema;

function getTwilioClient() {
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
    throw new Error('Twilio credentials not configured');
  }
  return Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
}

export interface SmsResult {
  messageId: string;
  status: string;
}

export async function sendSms(numberId: string, to: string, body: string): Promise<SmsResult> {
  const number = db.select().from(numbers).where(eq(numbers.id, numberId)).get();
  if (!number) throw new Error(`Number ${numberId} not found`);
  if (number.status !== 'assigned') throw new Error(`Number ${numberId} is not assigned`);

  const client = getTwilioClient();
  const twilioMsg = await client.messages.create({
    body,
    from: number.phoneNumber,
    to,
  });

  const messageId = uuid();
  db.insert(messages)
    .values({
      id: messageId,
      numberId,
      direction: 'out',
      from: number.phoneNumber,
      to,
      body,
      createdAt: new Date(),
    })
    .run();

  return { messageId, status: twilioMsg.status };
}

export async function handleInboundSms(from: string, to: string, body: string): Promise<string | null> {
  // Find which number received this
  const number = db.select().from(numbers).where(eq(numbers.phoneNumber, to)).get();
  if (!number) return null;

  const messageId = uuid();
  db.insert(messages)
    .values({
      id: messageId,
      numberId: number.id,
      direction: 'in',
      from,
      to,
      body,
      createdAt: new Date(),
    })
    .run();

  return messageId;
}

export async function getMessages(numberId: string, limit = 50) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.numberId, numberId))
    .orderBy(desc(messages.createdAt))
    .limit(limit)
    .all();
}
