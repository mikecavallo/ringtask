import { config } from '../config.js';
import { getDb } from '../db/index.js';
import { calls } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const RETELL_API_BASE = 'https://api.retellai.com';

// ═══════════════════════════════════════════
// RINGTASK VOICE AGENT — RETELL PROMPT
// ═══════════════════════════════════════════

export const RINGTASK_AGENT_PROMPT = `You are a RingTask Voice Agent — an AI that makes phone calls on behalf of users and other AI agents.

## WHO YOU ARE
You are a professional, adaptable phone agent. You are NOT a chatbot. You are making a real phone call to a real person. Act like a confident human caller.

## YOUR ROLE IN THE SYSTEM
You are one cog in the RingTask platform. Here's how it works:
1. A user or AI agent submits a "mission" — a goal for a phone call (e.g., "Call this restaurant and book a table for 4 at 7pm")
2. You receive the mission details and the phone number to call
3. You make the call, accomplish the mission, and report back with the outcome
4. The transcript and result get returned to whoever requested the call

## HOW TO HANDLE MISSIONS
Each call comes with:
- **mission**: The specific goal you need to accomplish
- **style**: (optional) How to approach the call — professional, casual, friendly, firm, etc.
- **context**: (optional) Additional background info

### Rules:
1. **Stay on mission.** Don't go off-topic. You have one job — complete the mission.
2. **Be natural.** Sound like a real person making a real call. Use filler words occasionally ("um," "let me think..."). Don't be robotic.
3. **Adapt your tone** to the style requested. Default is friendly-professional.
4. **Handle objections gracefully.** If the person pushes back, stay polite but persistent (unless the style says otherwise).
5. **Identify yourself honestly** if asked directly. Say "I'm calling on behalf of [caller name if provided], I'm an AI assistant helping them with this call." Don't lie about being human if directly asked.
6. **Wrap up efficiently.** Once the mission is accomplished (or clearly can't be), end the call politely.
7. **Never share the platform details.** Don't mention "RingTask" or explain how the system works. You're just making a call.

### If you reach voicemail:
- Leave a brief, clear message accomplishing the mission if possible
- Include a callback number if one was provided
- Keep it under 30 seconds

### If the call can't be completed:
- Note why (wrong number, business closed, person refused, etc.)
- This info goes back to the user

## STYLE PRESETS
- **professional**: Business-appropriate, clear, efficient
- **casual**: Relaxed, conversational, like calling a friend
- **friendly**: Warm, upbeat, lots of pleasantries
- **firm**: Direct, no-nonsense, assertive but respectful
- **funny**: Light-hearted, crack a joke if appropriate
- **serious**: Somber, empathetic (for sensitive calls)

## SAFETY BOUNDARIES
- Do NOT make threats, harass, or intimidate anyone
- Do NOT impersonate law enforcement, government officials, or medical professionals
- Do NOT share personal information about the caller beyond what's in the mission
- Do NOT agree to anything that creates legal obligations for the caller
- If the person on the other end seems distressed, be empathetic and offer to have a human call back
- If asked to do something illegal or harmful, politely decline and end the call`;

// ═══════════════════════════════════════════
// RETELL API INTEGRATION
// ═══════════════════════════════════════════

interface CreateAgentResponse {
  agent_id: string;
  [key: string]: any;
}

interface CreateCallResponse {
  call_id: string;
  call_status: string;
  [key: string]: any;
}

interface CallDetailsResponse {
  call_id: string;
  call_status: string;
  transcript?: string;
  transcript_object?: Array<{ role: string; content: string }>;
  duration_ms?: number;
  recording_url?: string;
  call_analysis?: {
    call_summary?: string;
    call_successful?: boolean;
    user_sentiment?: string;
    custom_analysis_data?: Record<string, any>;
  };
  disconnection_reason?: string;
  [key: string]: any;
}

async function retellRequest(method: string, path: string, body?: any) {
  const res = await fetch(`${RETELL_API_BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${config.RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell API error (${res.status}): ${err}`);
  }

  return res.json();
}

// Create the RingTask agent in Retell (one-time setup)
export async function createRetellAgent(): Promise<CreateAgentResponse> {
  // First create an LLM with our prompt
  const llm = await retellRequest('POST', '/create-retell-llm', {
    general_prompt: RINGTASK_AGENT_PROMPT,
    general_tools: [],
    model: 'gpt-4o',
    model_temperature: 0.7,
  });

  // Then create the agent using that LLM
  const agent = await retellRequest('POST', '/create-agent', {
    agent_name: 'RingTask Voice Agent',
    response_engine: {
      type: 'retell-llm',
      llm_id: llm.llm_id,
    },
    voice_id: '11labs-Adrian',
    voice_model: 'eleven_turbo_v2',
    voice_temperature: 0.8,
    voice_speed: 1.0,
    enable_backchannel: true,
    backchannel_frequency: 0.8,
    backchannel_words: ['yeah', 'uh-huh', 'right', 'got it', 'sure'],
    responsiveness: 0.9,
    interruption_sensitivity: 0.8,
    language: 'en-US',
    enable_voicemail_detection: true,
    voicemail_message: 'Hi, I was calling to follow up on something. I\'ll try again later.',
    max_call_duration_ms: 300000, // 5 min max
    end_call_after_silence_ms: 15000,
    normalize_for_speech: true,
    ...(config.RETELL_WEBHOOK_URL ? {
      webhook_url: config.RETELL_WEBHOOK_URL,
      webhook_events: ['call_started', 'call_ended', 'call_analyzed'],
    } : {}),
    post_call_analysis_data: [
      {
        type: 'boolean',
        name: 'mission_accomplished',
        description: 'Whether the mission/goal of the call was successfully completed',
      },
      {
        type: 'string',
        name: 'outcome_summary',
        description: 'Brief summary of what happened and the outcome',
      },
      {
        type: 'string',
        name: 'follow_up_needed',
        description: 'Any follow-up actions needed, or "none"',
      },
    ],
    analysis_successful_prompt: 'The agent completed the mission described in the call.',
    analysis_summary_prompt: 'Summarize: what was the mission, what happened, and was it successful?',
  });

  console.log(`🤖 Created Retell agent: ${agent.agent_id}`);
  return agent;
}

// Make a call via Retell
export async function makeRetellCall(params: {
  userId: string;
  toNumber: string;
  fromNumber: string;
  missionText: string;
  style?: string;
  callerName?: string;
  context?: string;
}): Promise<{ callId: string; retellCallId: string; status: string }> {
  const agentId = config.RETELL_AGENT_ID;
  if (!agentId) throw new Error('Retell agent not configured (RETELL_AGENT_ID)');

  // Build dynamic variables to inject mission into the prompt
  const dynamicVariables: Record<string, string> = {
    mission: params.missionText,
    style: params.style || 'professional',
  };
  if (params.callerName) dynamicVariables.caller_name = params.callerName;
  if (params.context) dynamicVariables.context = params.context;

  // Construct the begin message based on the mission
  // The agent will figure out the right opener from the mission context

  const call: CreateCallResponse = await retellRequest('POST', '/v2/create-phone-call', {
    from_number: params.fromNumber,
    to_number: params.toNumber,
    override_agent_id: agentId,
    retell_llm_dynamic_variables: dynamicVariables,
    metadata: {
      ringtask_user_id: params.userId,
      mission: params.missionText,
    },
  });

  // Store in our DB
  const db = getDb();
  const callRecord = {
    id: randomUUID(),
    numberId: null,
    userId: params.userId,
    toNumber: params.toNumber,
    missionText: params.missionText,
    status: 'in-progress' as const,
    transcript: null,
    durationSeconds: null,
    creditsUsed: null,
    createdAt: new Date(),
    retellCallId: call.call_id,
  };

  db.insert(calls).values(callRecord).run();

  return {
    callId: callRecord.id,
    retellCallId: call.call_id,
    status: 'initiated',
  };
}

// Get call result from Retell
export async function getRetellCallResult(callId: string): Promise<{
  status: string;
  transcript?: string;
  duration_seconds?: number;
  recording_url?: string;
  mission_accomplished?: boolean;
  outcome_summary?: string;
  follow_up?: string;
} | null> {
  const db = getDb();
  const callRecord = db.select().from(calls).where(eq(calls.id, callId)).get();
  if (!callRecord) return null;

  const retellCallId = (callRecord as any).retell_call_id;
  if (!retellCallId) {
    return {
      status: callRecord.status,
      transcript: callRecord.transcript || undefined,
      duration_seconds: callRecord.durationSeconds || undefined,
    };
  }

  // Fetch latest from Retell
  try {
    const details: CallDetailsResponse = await retellRequest('GET', `/v2/get-call/${retellCallId}`);

    // Update our DB with latest
    const updates: any = {
      status: details.call_status === 'ended' ? 'completed' : details.call_status,
    };

    if (details.transcript) updates.transcript = details.transcript;
    if (details.duration_ms) updates.duration_seconds = Math.ceil(details.duration_ms / 1000);

    db.update(calls).set(updates).where(eq(calls.id, callId)).run();

    return {
      status: updates.status || callRecord.status,
      transcript: details.transcript,
      duration_seconds: details.duration_ms ? Math.ceil(details.duration_ms / 1000) : undefined,
      recording_url: details.recording_url,
      mission_accomplished: details.call_analysis?.custom_analysis_data?.mission_accomplished,
      outcome_summary: details.call_analysis?.custom_analysis_data?.outcome_summary || details.call_analysis?.call_summary,
      follow_up: details.call_analysis?.custom_analysis_data?.follow_up_needed,
    };
  } catch (err) {
    // If Retell API fails, return what we have
    return {
      status: callRecord.status,
      transcript: callRecord.transcript || undefined,
      duration_seconds: callRecord.durationSeconds || undefined,
    };
  }
}

// Handle Retell webhook (call ended)
export async function handleRetellWebhook(event: any) {
  if (event.event === 'call_ended' || event.event === 'call_analyzed') {
    const retellCallId = event.call?.call_id || event.data?.call_id;
    if (!retellCallId) return;

    const db = getDb();
    // Find our call record by retell_call_id
    // Note: we'd need to add retell_call_id column, for now search by metadata
    const details = event.call || event.data;

    if (details?.metadata?.ringtask_user_id) {
      // Calculate credits used (5 credits per minute)
      const durationMin = details.duration_ms ? Math.ceil(details.duration_ms / 60000) : 1;
      const creditsUsed = durationMin * config.CREDITS_PER_CALL_MINUTE;

      console.log(`📞 Call ended: ${retellCallId} — ${durationMin}min, ${creditsUsed} credits`);
    }
  }
}
