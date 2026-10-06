import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Every test file gets its own in-memory SQLite database and no real credentials.
    env: {
      DATABASE_URL: ':memory:',
      RINGTASK_MOCK: '',
      TWILIO_ACCOUNT_SID: '',
      TWILIO_AUTH_TOKEN: '',
      TWILIO_PHONE_NUMBERS: '',
      RETELL_API_KEY: '',
      RETELL_AGENT_ID: '',
      STRIPE_SECRET_KEY: '',
      STRIPE_WEBHOOK_SECRET: '',
      RINGTASK_API_KEY: '',
      ADMIN_API_KEY: '',
      BASE_URL: '',
    },
  },
});
