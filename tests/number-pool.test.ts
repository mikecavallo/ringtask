import { beforeEach, describe, expect, it } from 'vitest';
import { sqlite } from '../src/db/index.js';
import { assignNumber, releaseNumber, expireNumbers, getAssignedNumbers, seedNumbers } from '../src/services/number-pool.js';
import { createUser, resetDb, seedPool } from './helpers.js';

const statusOf = (id: string) =>
  (sqlite.prepare('SELECT status FROM numbers WHERE id = ?').get(id) as { status: string }).status;

describe('number pool', () => {
  beforeEach(resetDb);

  it('seeds numbers idempotently', async () => {
    expect(await seedNumbers(['+15550100001', '+15550100002'])).toBe(2);
    expect(await seedNumbers(['+15550100001'])).toBe(0);
  });

  it('assigns an available number to the user', async () => {
    await seedPool(1);
    const user = await createUser();
    const assigned = await assignNumber(user.id, 2);

    expect(assigned.phoneNumber).toBe('+15550100001');
    expect(assigned.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(await getAssignedNumbers(user.id)).toHaveLength(1);
    expect(statusOf(assigned.numberId)).toBe('assigned');
  });

  it('never hands the same number to two users', async () => {
    await seedPool(1);
    const a = await createUser();
    const b = await createUser();
    await assignNumber(a.id);
    await expect(assignNumber(b.id)).rejects.toThrow('No numbers available');
  });

  it('rejects invalid durations', async () => {
    await seedPool(1);
    const user = await createUser();
    await expect(assignNumber(user.id, 0)).rejects.toThrow('duration_hours');
    await expect(assignNumber(user.id, 10_000)).rejects.toThrow('duration_hours');
  });

  it('only lets the holder release a number, then puts it in cooldown', async () => {
    await seedPool(1);
    const owner = await createUser();
    const other = await createUser();
    const { numberId } = await assignNumber(owner.id);

    await expect(releaseNumber(other.id, numberId)).rejects.toThrow('not assigned to you');
    await releaseNumber(owner.id, numberId);
    expect(statusOf(numberId)).toBe('cooldown');
  });

  it('expires overdue assignments and recycles numbers after cooldown', async () => {
    await seedPool(1);
    const user = await createUser();
    const { numberId } = await assignNumber(user.id, 1);

    expect(await expireNumbers(new Date(Date.now() + 2 * 3600_000))).toBe(1);
    expect(statusOf(numberId)).toBe('cooldown');

    await expireNumbers(new Date(Date.now() + 48 * 3600_000));
    expect(statusOf(numberId)).toBe('available');
  });
});
