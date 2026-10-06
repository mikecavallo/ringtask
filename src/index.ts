import { buildApp } from './app.js';
import { config } from './config.js';
import { initDatabase } from './db/index.js';
import { expireNumbers, seedNumbers, MOCK_POOL_NUMBERS } from './services/number-pool.js';
import { pollPendingPayments } from './services/payments-solana.js';

async function main() {
  initDatabase();

  const app = await buildApp({ logger: true });

  const pool = config.MOCK_PROVIDERS ? MOCK_POOL_NUMBERS : config.TWILIO_PHONE_NUMBERS;
  const added = await seedNumbers(pool);
  app.log.info(`Number pool: ${pool.length} configured, ${added} newly added`);
  if (config.MOCK_PROVIDERS) {
    app.log.warn('MOCK MODE: Twilio and Retell are replaced by local mocks. No SMS is sent and no calls are placed.');
  }

  if (config.SOLANA_TREASURY_ADDRESS) setInterval(pollPendingPayments, 15_000);

  setInterval(async () => {
    const expired = await expireNumbers();
    if (expired > 0) app.log.info(`Expired ${expired} number assignments`);
  }, 5 * 60 * 1000);

  await app.listen({ port: config.API_PORT, host: '0.0.0.0' });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
