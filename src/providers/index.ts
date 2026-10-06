import { config } from '../config.js';
import { MockSmsProvider, MockVoiceProvider } from './mock.js';
import { RetellVoiceProvider } from './retell.js';
import { TwilioSmsProvider } from './twilio.js';
import type { SmsProvider, VoiceProvider } from './types.js';

export type * from './types.js';

let smsOverride: SmsProvider | null = null;
let voiceOverride: VoiceProvider | null = null;
let mockSms: MockSmsProvider | null = null;
let mockVoice: MockVoiceProvider | null = null;

export function getSmsProvider(): SmsProvider {
  if (smsOverride) return smsOverride;
  if (config.MOCK_PROVIDERS) return (mockSms ??= new MockSmsProvider());
  return new TwilioSmsProvider();
}

export function getVoiceProvider(): VoiceProvider {
  if (voiceOverride) return voiceOverride;
  if (config.MOCK_PROVIDERS) return (mockVoice ??= new MockVoiceProvider());
  return new RetellVoiceProvider();
}

/** True when outbound voice calls can actually be attempted. */
export function isVoiceConfigured(): boolean {
  return Boolean(voiceOverride) || config.MOCK_PROVIDERS || Boolean(config.RETELL_API_KEY && config.RETELL_AGENT_ID);
}

/** Test hook: force specific provider instances (pass null to reset). */
export function setProviders(p: { sms?: SmsProvider | null; voice?: VoiceProvider | null }) {
  if (p.sms !== undefined) smsOverride = p.sms;
  if (p.voice !== undefined) voiceOverride = p.voice;
}
