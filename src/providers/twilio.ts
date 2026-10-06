import Twilio from 'twilio';
import { config } from '../config.js';
import type { SmsProvider, SendSmsParams, SendSmsResult } from './types.js';

export class TwilioSmsProvider implements SmsProvider {
  readonly name = 'twilio';

  async send({ from, to, body }: SendSmsParams): Promise<SendSmsResult> {
    if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
      throw new Error('Twilio credentials not configured (set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN, or run with RINGTASK_MOCK=1)');
    }
    const client = Twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN);
    const msg = await client.messages.create({ from, to, body });
    return { providerMessageId: msg.sid, status: msg.status, mock: false };
  }
}

/** Validate the X-Twilio-Signature header of an inbound webhook. */
export function validateTwilioSignature(signature: string | undefined, url: string, params: Record<string, string>): boolean {
  if (!signature || !config.TWILIO_AUTH_TOKEN) return false;
  return Twilio.validateRequest(config.TWILIO_AUTH_TOKEN, signature, url, params);
}
