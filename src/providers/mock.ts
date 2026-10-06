import { randomUUID } from 'crypto';
import type {
  SmsProvider, SendSmsParams, SendSmsResult,
  VoiceProvider, CreateCallParams, CreateCallResult, CallDetails,
} from './types.js';

/**
 * In-process SMS provider for demos and tests. Nothing is sent anywhere.
 */
export class MockSmsProvider implements SmsProvider {
  readonly name = 'mock';
  readonly sent: Array<SendSmsParams & { providerMessageId: string }> = [];

  async send(params: SendSmsParams): Promise<SendSmsResult> {
    const providerMessageId = `mock_sms_${randomUUID()}`;
    this.sent.push({ ...params, providerMessageId });
    return { providerMessageId, status: 'mock-sent', mock: true };
  }
}

/**
 * In-process voice provider for demos and tests. No phone call is placed.
 * A created call reports `in-progress` on the first status check and `completed`
 * afterwards, with a transcript that states plainly that it is simulated. It never
 * claims the mission succeeded.
 */
export class MockVoiceProvider implements VoiceProvider {
  readonly name = 'mock';
  private calls = new Map<string, { params: CreateCallParams; checks: number }>();

  async createCall(params: CreateCallParams): Promise<CreateCallResult> {
    const providerCallId = `mock_call_${randomUUID()}`;
    this.calls.set(providerCallId, { params, checks: 0 });
    return { providerCallId, mock: true };
  }

  async getCall(providerCallId: string): Promise<CallDetails> {
    const entry = this.calls.get(providerCallId);
    if (!entry) throw new Error(`Mock call ${providerCallId} not found (mock state is in-memory and per-process)`);
    entry.checks += 1;

    if (entry.checks === 1) {
      return { providerCallId, status: 'in-progress', providerStatus: 'ongoing', mock: true };
    }

    const mission = entry.params.dynamicVariables.mission ?? '';
    return {
      providerCallId,
      status: 'completed',
      providerStatus: 'ended',
      durationSeconds: 42,
      transcript: [
        '[MOCK TRANSCRIPT: no real call was placed]',
        `Agent: Hi, I'm an AI assistant calling about: ${mission}`,
        'Callee: (simulated)',
      ].join('\n'),
      summary: 'Mock mode: the call was simulated locally. Configure Retell to place real calls.',
      mock: true,
    };
  }
}
