// Provider interfaces. Real implementations talk to Twilio (SMS) and Retell (voice);
// mock implementations run fully in-process so the API and MCP server can be demoed
// without any credentials. Every provider result carries `mock` so callers can never
// mistake a simulated result for a real one.

export interface SendSmsParams {
  from: string;
  to: string;
  body: string;
}

export interface SendSmsResult {
  providerMessageId: string;
  status: string;
  mock: boolean;
}

export interface SmsProvider {
  readonly name: string;
  send(params: SendSmsParams): Promise<SendSmsResult>;
}

export interface CreateCallParams {
  from: string;
  to: string;
  dynamicVariables: Record<string, string>;
  metadata: Record<string, string>;
}

export interface CreateCallResult {
  providerCallId: string;
  mock: boolean;
}

/** Normalized call state, independent of the provider's own status vocabulary. */
export type CallStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface CallDetails {
  providerCallId: string;
  status: CallStatus;
  providerStatus: string;
  transcript?: string;
  durationSeconds?: number;
  recordingUrl?: string;
  summary?: string;
  missionAccomplished?: boolean;
  followUp?: string;
  disconnectionReason?: string;
  mock: boolean;
}

export interface VoiceProvider {
  readonly name: string;
  createCall(params: CreateCallParams): Promise<CreateCallResult>;
  getCall(providerCallId: string): Promise<CallDetails>;
}
