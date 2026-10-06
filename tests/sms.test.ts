import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Twilio SDK: no network, no credentials.
const twilioMock = vi.hoisted(() => {
  const create = vi.fn(async (args: { from: string; to: string; body: string }) => ({ sid: 'SM123', status: 'queued', ...args }));
  const factory = vi.fn(() => ({ messages: { create } }));
  const validateRequest = vi.fn((_token: string, signature: string) => signature === 'valid-signature');
  return { create, factory, validateRequest };
});
vi.mock('twilio', () => ({
  default: Object.assign(twilioMock.factory, { validateRequest: twilioMock.validateRequest }),
}));

import { config } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { assignNumber } from '../src/services/number-pool.js';
import { sendSms, getMessages } from '../src/services/sms.js';
import { createUser, credits, resetDb, seedPool } from './helpers.js';

describe('SMS via Twilio (mocked)', () => {
  beforeEach(() => {
    resetDb();
    vi.clearAllMocks();
    config.MOCK_PROVIDERS = false;
    config.TWILIO_ACCOUNT_SID = 'ACtest';
    config.TWILIO_AUTH_TOKEN = 'test-token';
    config.BASE_URL = 'https://api.example.test';
  });

  it('sends through Twilio from the leased number, records it, and charges 1 credit', async () => {
    await seedPool(1);
    const user = await createUser();
    const { numberId, phoneNumber } = await assignNumber(user.id);

    const result = await sendSms(user.id, numberId, '+15557654321', 'Your appointment is confirmed for 3pm.');

    expect(twilioMock.factory).toHaveBeenCalledWith('ACtest', 'test-token');
    expect(twilioMock.create).toHaveBeenCalledWith({ from: phoneNumber, to: '+15557654321', body: 'Your appointment is confirmed for 3pm.' });
    expect(result).toMatchObject({ status: 'queued', mock: false });
    expect(await credits(user.id)).toBe(99);

    const msgs = await getMessages(user.id, numberId);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatchObject({ direction: 'out', to: '+15557654321' });
  });

  it('refuses to send from a number the user does not hold', async () => {
    await seedPool(1);
    const owner = await createUser();
    const other = await createUser();
    const { numberId } = await assignNumber(owner.id);

    await expect(sendSms(other.id, numberId, '+15557654321', 'hi')).rejects.toThrow('not assigned to you');
    await expect(getMessages(other.id, numberId)).rejects.toThrow('not assigned to you');
    expect(twilioMock.create).not.toHaveBeenCalled();
  });

  it('validates destination and credits before calling Twilio', async () => {
    await seedPool(1);
    const user = await createUser(0);
    const { numberId } = await assignNumber(user.id);

    await expect(sendSms(user.id, numberId, '555-1234', 'hi')).rejects.toThrow('E.164');
    await expect(sendSms(user.id, numberId, '+15557654321', 'hi')).rejects.toThrow('Insufficient credits');
    expect(twilioMock.create).not.toHaveBeenCalled();
  });

  it('does not record or charge when Twilio rejects the message', async () => {
    await seedPool(1);
    const user = await createUser();
    const { numberId } = await assignNumber(user.id);
    twilioMock.create.mockRejectedValueOnce(new Error('Twilio: invalid To number'));

    await expect(sendSms(user.id, numberId, '+15557654321', 'hi')).rejects.toThrow('invalid To');
    expect(await credits(user.id)).toBe(100);
    expect(await getMessages(user.id, numberId)).toHaveLength(0);
  });

  it('accepts inbound SMS webhooks only with a valid Twilio signature', async () => {
    await seedPool(1);
    const user = await createUser();
    const { numberId, phoneNumber } = await assignNumber(user.id);
    const app = await buildApp();
    const payload = `From=%2B15557654321&To=${encodeURIComponent(phoneNumber)}&Body=Yes%2C+3pm+works`;
    const headers = { 'content-type': 'application/x-www-form-urlencoded' };

    const forged = await app.inject({ method: 'POST', url: '/api/webhooks/sms', payload, headers });
    expect(forged.statusCode).toBe(403);

    const ok = await app.inject({
      method: 'POST', url: '/api/webhooks/sms', payload,
      headers: { ...headers, 'x-twilio-signature': 'valid-signature' },
    });
    expect(ok.statusCode).toBe(200);
    expect(twilioMock.validateRequest).toHaveBeenLastCalledWith(
      'test-token', 'valid-signature', 'https://api.example.test/api/webhooks/sms',
      { From: '+15557654321', To: phoneNumber, Body: 'Yes, 3pm works' },
    );
    const msgs = await getMessages(user.id, numberId);
    expect(msgs[0]).toMatchObject({ direction: 'in', body: 'Yes, 3pm works' });
    await app.close();
  });
});
