import { eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import Twilio from 'twilio';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';

const { calls, usageLogs } = schema;

export interface MissionParams {
  userId: string;
  toNumber: string;
  missionText: string;
  style?: string;
  numberId?: string;
}

export interface MissionResult {
  callId: string;
  status: string;
}

export interface CallResult {
  callId: string;
  status: string;
  transcript: string | null;
  durationSeconds: number | null;
  creditsUsed: number | null;
}

export async function initiateMission(params: MissionParams): Promise<MissionResult> {
  const { userId, toNumber, missionText, style, numberId } = params;
  const callId = uuid();

  db.insert(calls)
    .values({
      id: callId,
      numberId: numberId ?? null,
      userId,
      toNumber,
      missionText: style ? `[Style: ${style}] ${missionText}` : missionText,
      status: 'pending',
      createdAt: new Date(),
    })
    .run();

  // TODO: When real-time voice is implemented, this will:
  // 1. Pick a number from the pool (or use provided numberId)
  // 2. Initiate a Twilio call with a webhook URL
  // 3. On connect, start streaming audio to/from an LLM
  // 4. The LLM follows the missionText instructions
  //
  // For now, mark as pending. The voice webhook handlers
  // will drive the state machine when implemented.

  if (config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN) {
    try {
      const client = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
      const fromNumber = config.TWILIO_PHONE_NUMBERS[0];
      if (!fromNumber) throw new Error('No Twilio numbers configured');

      // Initiate the call — voice webhook will handle the conversation
      await client.calls.create({
        to: toNumber,
        from: fromNumber,
        url: `${process.env.BASE_URL || 'http://localhost:' + config.API_PORT}/api/webhooks/voice?callId=${callId}`,
        statusCallback: `${process.env.BASE_URL || 'http://localhost:' + config.API_PORT}/api/webhooks/voice/status?callId=${callId}`,
      });

      db.update(calls)
        .set({ status: 'in-progress' })
        .where(eq(calls.id, callId))
        .run();

      return { callId, status: 'in-progress' };
    } catch (err) {
      db.update(calls)
        .set({ status: 'failed' })
        .where(eq(calls.id, callId))
        .run();
      return { callId, status: 'failed' };
    }
  }

  return { callId, status: 'pending' };
}

export async function handleCallConnected(callId: string): Promise<string> {
  // Returns TwiML for the call
  // TODO: Replace with real-time audio streaming (Twilio Media Streams → LLM)
  const call = db.select().from(calls).where(eq(calls.id, callId)).get();
  if (!call) throw new Error(`Call ${callId} not found`);

  db.update(calls)
    .set({ status: 'in-progress' })
    .where(eq(calls.id, callId))
    .run();

  // Placeholder TwiML — will be replaced with <Stream> for real-time
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>This is a RingTask voice mission. The AI agent feature is being set up.</Say>
  <Pause length="2"/>
  <Say>Mission: ${escapeXml(call.missionText)}</Say>
  <Hangup/>
</Response>`;
}

export async function handleCallEnded(callId: string, durationSeconds?: number): Promise<void> {
  const call = db.select().from(calls).where(eq(calls.id, callId)).get();
  if (!call) return;

  const duration = durationSeconds ?? 0;
  const creditsUsed = Math.ceil(duration / 60) * config.CREDITS_PER_CALL_MINUTE;

  db.update(calls)
    .set({
      status: 'completed',
      durationSeconds: duration,
      creditsUsed,
    })
    .where(eq(calls.id, callId))
    .run();

  // Log usage
  db.insert(usageLogs)
    .values({
      id: uuid(),
      userId: call.userId,
      action: 'voice_call',
      creditsUsed,
      metadata: JSON.stringify({ callId, toNumber: call.toNumber, durationSeconds: duration }),
      createdAt: new Date(),
    })
    .run();
}

export async function getCallResult(callId: string): Promise<CallResult | null> {
  const call = db.select().from(calls).where(eq(calls.id, callId)).get();
  if (!call) return null;

  return {
    callId: call.id,
    status: call.status,
    transcript: call.transcript,
    durationSeconds: call.durationSeconds,
    creditsUsed: call.creditsUsed,
  };
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
