import { initDatabase, sqlite } from '../src/db/index.js';
import { register, getUserById } from '../src/services/auth.js';
import { seedNumbers } from '../src/services/number-pool.js';

let counter = 0;

export function resetDb() {
  initDatabase();
  sqlite.exec(`
    DELETE FROM usage_logs; DELETE FROM messages; DELETE FROM calls;
    DELETE FROM numbers; DELETE FROM users; DELETE FROM processed_webhooks;
  `);
}

export async function createUser(credits?: number) {
  const { id, apiKey } = await register(`user${++counter}@example.com`);
  if (credits !== undefined) sqlite.prepare('UPDATE users SET credits = ? WHERE id = ?').run(credits, id);
  return { id, apiKey };
}

export async function credits(userId: string) {
  return (await getUserById(userId))!.credits;
}

export async function seedPool(n = 2) {
  const nums = Array.from({ length: n }, (_, i) => `+1555010000${i + 1}`);
  await seedNumbers(nums);
  return nums;
}
