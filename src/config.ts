import 'dotenv/config';

export const config = {
  TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
  TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
  TWILIO_PHONE_NUMBERS: (process.env.TWILIO_PHONE_NUMBERS || '').split(',').filter(Boolean),
  DATABASE_URL: process.env.DATABASE_URL || 'ringtask.db',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  API_PORT: parseInt(process.env.API_PORT || '3210', 10),
  COOLDOWN_HOURS: parseInt(process.env.COOLDOWN_HOURS || '24', 10),
  DEFAULT_ASSIGN_HOURS: parseInt(process.env.DEFAULT_ASSIGN_HOURS || '4', 10),
  CREDITS_PER_SMS: 1,
  CREDITS_PER_CALL_MINUTE: 5,
  NEW_USER_CREDITS: 100,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || '',
  SOLANA_TREASURY_ADDRESS: process.env.SOLANA_TREASURY_ADDRESS || '',
  SOL_PRICE_USD: parseFloat(process.env.SOL_PRICE_USD || '150'),
  RETELL_API_KEY: process.env.RETELL_API_KEY || '',
  RETELL_AGENT_ID: process.env.RETELL_AGENT_ID || '',
  RETELL_WEBHOOK_URL: process.env.RETELL_WEBHOOK_URL || '',
};
