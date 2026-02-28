import Fastify from 'fastify';
import { initDatabase } from './db/index.js';
import { registerRoutes } from './api/routes.js';
import { seedNumbers } from './services/number-pool.js';
import { expireNumbers } from './services/number-pool.js';
import { config } from './config.js';
import { pollPendingPayments } from './services/payments-solana.js';

async function main() {
  // Initialize database
  initDatabase();
  console.log('✅ Database initialized');

  // Seed phone numbers from config
  if (config.TWILIO_PHONE_NUMBERS.length > 0) {
    await seedNumbers(config.TWILIO_PHONE_NUMBERS);
    console.log(`✅ Seeded ${config.TWILIO_PHONE_NUMBERS.length} phone numbers`);
  }

  // Start Fastify
  const app = Fastify({ logger: true });
  await registerRoutes(app);

  // Poll Solana payments every 15 seconds
  setInterval(pollPendingPayments, 15_000);

  // Number expiration check every 5 minutes
  setInterval(async () => {
    const expired = await expireNumbers();
    if (expired > 0) console.log(`♻️ Expired ${expired} number assignments`);
  }, 5 * 60 * 1000);

  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
  console.log(`🚀 RingTask API running on port ${config.API_PORT}`);
  console.log(`   MCP server available via: npm run mcp`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
