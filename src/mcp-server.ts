import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { config } from './config.js';
import { initDatabase } from './db/index.js';
import { createMcpServer } from './mcp/tools.js';
import { getOrCreateDemoUser, getUserByApiKey, type User } from './services/auth.js';
import { MOCK_POOL_NUMBERS, seedNumbers } from './services/number-pool.js';

// stdout is the MCP protocol channel, so all diagnostics go to stderr.
const log = (msg: string) => process.stderr.write(`[ringtask-mcp] ${msg}\n`);

async function resolveUser(): Promise<User> {
  if (config.RINGTASK_API_KEY) {
    const user = await getUserByApiKey(config.RINGTASK_API_KEY);
    if (!user) throw new Error('RINGTASK_API_KEY does not match any user');
    return user;
  }
  if (config.MOCK_PROVIDERS) return getOrCreateDemoUser();
  throw new Error('Set RINGTASK_API_KEY (register via POST /api/auth/register), or run with RINGTASK_MOCK=1 for a local demo.');
}

async function main() {
  initDatabase();
  await seedNumbers(config.MOCK_PROVIDERS ? MOCK_POOL_NUMBERS : config.TWILIO_PHONE_NUMBERS);
  if (config.MOCK_PROVIDERS) log('MOCK MODE: no SMS is sent and no calls are placed.');

  const server = createMcpServer(resolveUser);
  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  log(`fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
