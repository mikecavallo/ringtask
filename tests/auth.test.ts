import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { register, deductCredits, getUserByApiKey } from '../src/services/auth.js';
import { createUser, credits, resetDb } from './helpers.js';

describe('auth', () => {
  beforeEach(resetDb);

  it('registers a user with an rt_ API key and starter credits', async () => {
    const res = await register('Alice@Example.com');
    expect(res.apiKey).toMatch(/^rt_[0-9a-f]{48}$/);
    expect(res.credits).toBe(100);
    expect((await getUserByApiKey(res.apiKey))?.email).toBe('alice@example.com');
  });

  it('rejects invalid and duplicate emails', async () => {
    await expect(register('not-an-email')).rejects.toThrow('Invalid email');
    await register('bob@example.com');
    await expect(register('BOB@example.com')).rejects.toThrow('already registered');
  });

  it('deducts credits atomically and refuses to go negative', async () => {
    const user = await createUser(3);
    await deductCredits(user.id, 2, 'test');
    expect(await credits(user.id)).toBe(1);
    await expect(deductCredits(user.id, 2, 'test')).rejects.toThrow('Insufficient credits');
    expect(await credits(user.id)).toBe(1);
  });

  describe('HTTP API key middleware', () => {
    it('returns 401 without or with a bad X-API-Key and 200 with a valid one', async () => {
      const app = await buildApp();
      const user = await createUser();

      expect((await app.inject({ method: 'GET', url: '/api/balance' })).statusCode).toBe(401);
      expect((await app.inject({ method: 'GET', url: '/api/balance', headers: { 'x-api-key': 'rt_nope' } })).statusCode).toBe(401);

      const ok = await app.inject({ method: 'GET', url: '/api/balance', headers: { 'x-api-key': user.apiKey } });
      expect(ok.statusCode).toBe(200);
      expect(ok.json()).toEqual({ credits: 100 });
      await app.close();
    });

    it('registers via POST /api/auth/register', async () => {
      const app = await buildApp();
      const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'carol@example.com' } });
      expect(res.statusCode).toBe(201);
      const dup = await app.inject({ method: 'POST', url: '/api/auth/register', payload: { email: 'carol@example.com' } });
      expect(dup.statusCode).toBe(409);
      await app.close();
    });

    it('locks the admin create-agent route when ADMIN_API_KEY is unset', async () => {
      const app = await buildApp();
      const res = await app.inject({ method: 'POST', url: '/api/admin/create-agent' });
      expect(res.statusCode).toBe(403);
      await app.close();
    });
  });
});
