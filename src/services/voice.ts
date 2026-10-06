import { and, eq } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';
import { getVoiceProvider, isVoiceConfigured, type CallDetails } from '../providers/index.js';
import { chargeUsage, getUserById } from './auth.js';
import { anyPoolNumber, getAssignedNumbers } from './number-pool.js';
import { E164_RE } from './sms.js';

const { calls } = schema;

type CallRow = typeof calls.$inferSelect;

export interface MissionParams {
  userId: string;
  toNumber: string;
  missionText: string;
  style?: string;
  callerName?: string;
  context?: string;
}

export interface MissionStarted {
  callId: string;
  status: 'in-progress';
  fromNumber: string;
  mock: boolean;
}

export interface CallResult {
  callId: string;
  status: string;
  toNumber: string;
  mission: string;
  transcript: string | null;
  summary: string | null;
  recordingUrl: string | null;
  durationSeconds: number | null;
  creditsUsed: number | null;
  missionAccomplished?: boolean;
  mock: boolean;
}

const isMockCall = (row: CallRow) => Boolean(row.retellCallId?.startsWith('mock_'));

/**
 * Start a voice mission: the configured voice provider (Retell, or the mock provider)
 * places an outbound call with an AI agent that pursues `missionText`.
 * Throws if voice is not configured or the provider rejects the call; a failed call is
 * recorded with status `failed` and never reported as started.
 */
export async function startMission(params: MissionParams): Promise<MissionStarted> {
  const { userId, toNumber, missionText } = params;
  if (!isVoiceConfigured()) {
    throw new Error('Voice calling is not configured. Set RETELL_API_KEY and RETELL_AGENT_ID, or run with RINGTASK_MOCK=1.');
  }
  if (!E164_RE.test(toNumber)) throw new Error('`to` must be an E.164 phone number, e.g. +15551234567');
  if (!missionText?.trim()) throw new Error('mission is required');

  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  if (user.credits < config.CREDITS_PER_CALL_MINUTE) throw new Error('Insufficient credits');

  const owned = await getAssignedNumbers(userId);
  const fromNumber = owned[0]?.phoneNumber ?? config.TWILIO_PHONE_NUMBERS[0] ?? (await anyPoolNumber());
  if (!fromNumber) throw new Error('No caller number available. Add numbers to TWILIO_PHONE_NUMBERS.');

  const callId = uuid();
  db.insert(calls)
    .values({
      id: callId,
      numberId: owned[0]?.id ?? null,
      userId,
      toNumber,
      missionText,
      status: 'pending',
      createdAt: new Date(),
    })
    .run();

  try {
    const created = await getVoiceProvider().createCall({
      from: fromNumber,
      to: toNumber,
      dynamicVariables: {
        mission: missionText,
        style: params.style || 'friendly-professional',
        caller_name: params.callerName || 'a RingTask user',
        context: params.context || 'none',
      },
      metadata: { ringtask_call_id: callId, ringtask_user_id: userId },
    });
    db.update(calls)
      .set({ status: 'in-progress', retellCallId: created.providerCallId })
      .where(eq(calls.id, callId))
      .run();
    return { callId, status: 'in-progress', fromNumber, mock: created.mock };
  } catch (err) {
    db.update(calls).set({ status: 'failed' }).where(eq(calls.id, callId)).run();
    throw err;
  }
}

/** Persist provider state for a call and bill it once it reaches a terminal state. */
async function applyCallDetails(row: CallRow, details: CallDetails): Promise<CallRow> {
  const updates: Partial<CallRow> = { status: details.status };
  if (details.transcript !== undefined) updates.transcript = details.transcript;
  if (details.durationSeconds !== undefined) updates.durationSeconds = details.durationSeconds;
  if (details.summary !== undefined) updates.summary = details.summary;
  if (details.recordingUrl !== undefined) updates.recordingUrl = details.recordingUrl;

  const terminal = details.status === 'completed' || details.status === 'failed';
  if (terminal && row.creditsUsed === null) {
    const seconds = details.durationSeconds ?? 0;
    const billed = Math.ceil(seconds / 60) * config.CREDITS_PER_CALL_MINUTE;
    updates.creditsUsed = billed > 0
      ? await chargeUsage(row.userId, billed, 'voice_call', { callId: row.id, durationSeconds: seconds, mock: details.mock })
      : 0;
  }

  db.update(calls).set(updates).where(eq(calls.id, row.id)).run();
  return { ...row, ...updates };
}

function needsRefresh(row: CallRow): boolean {
  if (!row.retellCallId) return false;
  // Post-call analysis can arrive after the call ends, so keep polling until a summary exists.
  return row.status === 'pending' || row.status === 'in-progress' || (row.status === 'completed' && !row.summary);
}

export async function getCallResult(userId: string, callId: string): Promise<CallResult | null> {
  let row = db.select().from(calls).where(and(eq(calls.id, callId), eq(calls.userId, userId))).get();
  if (!row) return null;

  let missionAccomplished: boolean | undefined;
  if (needsRefresh(row)) {
    try {
      const details = await getVoiceProvider().getCall(row.retellCallId!);
      missionAccomplished = details.missionAccomplished;
      row = await applyCallDetails(row, details);
    } catch {
      // Provider unreachable: fall back to the last stored state.
    }
  }

  return {
    callId: row.id,
    status: row.status,
    toNumber: row.toNumber,
    mission: row.missionText,
    transcript: row.transcript,
    summary: row.summary,
    recordingUrl: row.recordingUrl,
    durationSeconds: row.durationSeconds,
    creditsUsed: row.creditsUsed,
    ...(missionAccomplished !== undefined ? { missionAccomplished } : {}),
    mock: isMockCall(row),
  };
}

/**
 * Handle a Retell webhook. The payload is treated only as a notification: the call ID
 * must match a call we created, and the call state is re-fetched from the provider API,
 * so a forged payload cannot change balances or results.
 */
export async function handleVoiceWebhook(payload: unknown): Promise<{ updated: boolean }> {
  const body = payload as { call?: { call_id?: string } } | null;
  const providerCallId = body?.call?.call_id;
  if (!providerCallId) return { updated: false };

  const row = db.select().from(calls).where(eq(calls.retellCallId, providerCallId)).get();
  if (!row) return { updated: false };

  const details = await getVoiceProvider().getCall(providerCallId);
  await applyCallDetails(row, details);
  return { updated: true };
}
