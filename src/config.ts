import 'dotenv/config';

function flag(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on'].includes((value || '').toLowerCase());
}

export const config = {
  // When true, Twilio and Retell are replaced by in-process mock providers.
  // Nothing leaves the machine and every provider response is labeled `mock: true`.
  MOCK_PROVIDERS: flag(process.env.RINGTASK_MOCK),

  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBERS: (process.env.TWILIO_PHONE_NUMBERS || '').split(',').map((s) => s.trim()).filter(Boolean),
  // Validate X-Twilio-Signature on inbound SMS webhooks (ignored in mock mode).
  TWILIO_VALIDATE_WEBHOOKS: process.env.TWILIO_VALIDATE_WEBHOOKS === undefined ? true : flag(process.env.TWILIO_VALIDATE_WEBHOOKS),

  DATABASE_URL: process.env.DATABASE_URL || 'ringtask.db',
  API_PORT: parseInt(process.env.API_PORT || '3210', 10),
  BASE_URL: process.env.BASE_URL || '',
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',

  COOLDOWN_HOURS: parseFloat(process.env.COOLDOWN_HOURS || '24'),
  DEFAULT_ASSIGN_HOURS: parseFloat(process.env.DEFAULT_ASSIGN_HOURS || '4'),
  MAX_ASSIGN_HOURS: parseFloat(process.env.MAX_ASSIGN_HOURS || '168'),
  CREDITS_PER_SMS: 1,
  CREDITS_PER_CALL_MINUTE: 5,
  NEW_USER_CREDITS: parseInt(process.env.NEW_USER_CREDITS || '100', 10),

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || '',
  SOLANA_TREASURY_ADDRESS: process.env.SOLANA_TREASURY_ADDRESS || '',
  SOL_PRICE_USD: parseFloat(process.env.SOL_PRICE_USD || '150'),

  RETELL_API_KEY: process.env.RETELL_API_KEY || '',
  RETELL_AGENT_ID: process.env.RETELL_AGENT_ID || '',
  RETELL_WEBHOOK_URL: process.env.RETELL_WEBHOOK_URL || '',

  // MCP server identity: the API key of the RingTask user the MCP tools act as.
  // In mock mode this may be left empty and a local demo user is created.
  RINGTASK_API_KEY: process.env.RINGTASK_API_KEY || '',
};
