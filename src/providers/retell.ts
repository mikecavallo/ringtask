import { config } from '../config.js';
import type { VoiceProvider, CreateCallParams, CreateCallResult, CallDetails, CallStatus } from './types.js';

const RETELL_API_BASE = 'https://api.retellai.com';

// Prompt for the Retell LLM behind the RingTask voice agent. Per-call details are
// injected through Retell dynamic variables ({{mission}}, {{style}}, ...).
export const RINGTASK_AGENT_PROMPT = `You are an AI assistant placing an outbound phone call on behalf of a person or business.

## THIS CALL
- Mission: {{mission}}
- Calling on behalf of: {{caller_name}}
- Style: {{style}}
- Extra context: {{context}}

## RULES
1. Open by saying you are an AI assistant calling on behalf of {{caller_name}}, then state the reason for the call.
2. Stay on the mission. Do not go off-topic.
3. Be polite, clear and concise. Adapt your tone to the requested style (professional, friendly, casual, firm, empathetic). Default is friendly-professional.
4. If the person declines or asks not to be called, accept it, thank them, and end the call.
5. Never claim to be human. Never invent facts that are not in the mission or context.
6. Once the mission is accomplished, or clearly cannot be, wrap up politely and end the call.

### Voicemail
Leave a short message (under 30 seconds) with the reason for the call and the callback details from the context, if any.

### If the call cannot be completed
Note why (wrong number, closed, refused, no answer) so it can be reported back.

## SAFETY
- Do not threaten, harass, pressure or deceive anyone.
- Do not impersonate law enforcement, government officials, or medical professionals.
- Do not share personal information beyond what is in the mission.
- Do not agree to anything that creates legal or financial obligations for the caller.
- If asked to do something illegal or harmful, decline and end the call.`;

interface RetellCallResponse {
  call_id: string;
  call_status: string;
  transcript?: string;
  duration_ms?: number;
  start_timestamp?: number;
  end_timestamp?: number;
  recording_url?: string;
  call_analysis?: {
    call_summary?: string;
    call_successful?: boolean;
    custom_analysis_data?: Record<string, unknown>;
  };
  disconnection_reason?: string;
}

async function retellRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (!config.RETELL_API_KEY) throw new Error('Retell is not configured (set RETELL_API_KEY, or run with RINGTASK_MOCK=1)');
  const res = await fetch(`${RETELL_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.RETELL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Retell API error (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

/** Map Retell's call_status vocabulary onto RingTask's normalized statuses. */
export function mapRetellStatus(callStatus: string, disconnectionReason?: string): CallStatus {
  switch (callStatus) {
    case 'registered':
    case 'ongoing':
      return 'in-progress';
    case 'ended':
      return 'completed';
    case 'error':
      return 'failed';
    case 'not_connected':
      return disconnectionReason ? 'failed' : 'in-progress';
    default:
      return 'in-progress';
  }
}

export function normalizeRetellCall(call: RetellCallResponse): CallDetails {
  const durationMs = call.duration_ms
    ?? (call.start_timestamp && call.end_timestamp ? call.end_timestamp - call.start_timestamp : undefined);
  const custom = call.call_analysis?.custom_analysis_data ?? {};
  return {
    providerCallId: call.call_id,
    status: mapRetellStatus(call.call_status, call.disconnection_reason),
    providerStatus: call.call_status,
    transcript: call.transcript,
    durationSeconds: durationMs !== undefined ? Math.ceil(durationMs / 1000) : undefined,
    recordingUrl: call.recording_url,
    summary: (custom.outcome_summary as string | undefined) ?? call.call_analysis?.call_summary,
    missionAccomplished: custom.mission_accomplished as boolean | undefined,
    followUp: custom.follow_up_needed as string | undefined,
    disconnectionReason: call.disconnection_reason,
    mock: false,
  };
}

export class RetellVoiceProvider implements VoiceProvider {
  readonly name = 'retell';

  async createCall(params: CreateCallParams): Promise<CreateCallResult> {
    if (!config.RETELL_AGENT_ID) throw new Error('Retell agent not configured (set RETELL_AGENT_ID)');
    const call = await retellRequest<RetellCallResponse>('POST', '/v2/create-phone-call', {
      from_number: params.from,
      to_number: params.to,
      override_agent_id: config.RETELL_AGENT_ID,
      retell_llm_dynamic_variables: params.dynamicVariables,
      metadata: params.metadata,
    });
    return { providerCallId: call.call_id, mock: false };
  }

  async getCall(providerCallId: string): Promise<CallDetails> {
    const call = await retellRequest<RetellCallResponse>('GET', `/v2/get-call/${encodeURIComponent(providerCallId)}`);
    return normalizeRetellCall(call);
  }
}

/** One-time setup: create the Retell LLM and agent used for RingTask calls. */
export async function createRetellAgent(): Promise<{ agent_id: string }> {
  const llm = await retellRequest<{ llm_id: string }>('POST', '/create-retell-llm', {
    general_prompt: RINGTASK_AGENT_PROMPT,
    general_tools: [{ type: 'end_call', name: 'end_call', description: 'End the call when the mission is done or cannot be completed.' }],
    model: 'gpt-4o',
    model_temperature: 0.4,
    default_dynamic_variables: {
      mission: 'not provided',
      caller_name: 'a RingTask user',
      style: 'friendly-professional',
      context: 'none',
    },
  });

  return retellRequest<{ agent_id: string }>('POST', '/create-agent', {
    agent_name: 'RingTask Voice Agent',
    response_engine: { type: 'retell-llm', llm_id: llm.llm_id },
    voice_id: '11labs-Adrian',
    language: 'en-US',
    max_call_duration_ms: 300000, // 5 minute hard cap
    end_call_after_silence_ms: 15000,
    ...(config.RETELL_WEBHOOK_URL ? { webhook_url: config.RETELL_WEBHOOK_URL } : {}),
    post_call_analysis_data: [
      { type: 'boolean', name: 'mission_accomplished', description: 'Whether the goal of the call was completed' },
      { type: 'string', name: 'outcome_summary', description: 'Brief summary of what happened and the outcome' },
      { type: 'string', name: 'follow_up_needed', description: 'Any follow-up actions needed, or "none"' },
    ],
  });
}
