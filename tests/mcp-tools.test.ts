import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { config } from '../src/config.js';
import { createMcpServer } from '../src/mcp/tools.js';
import { getOrCreateDemoUser } from '../src/services/auth.js';
import { MOCK_POOL_NUMBERS, seedNumbers } from '../src/services/number-pool.js';
import { resetDb } from './helpers.js';

type TextResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

describe('MCP tool handlers (mock provider mode)', () => {
  const client = new Client({ name: 'test-client', version: '1.0.0' });

  async function call(name: string, args: Record<string, unknown> = {}) {
    const res = (await client.callTool({ name, arguments: args })) as TextResult;
    return { data: JSON.parse(res.content[0].text), isError: Boolean(res.isError) };
  }

  beforeAll(async () => {
    resetDb();
    config.MOCK_PROVIDERS = true;
    await seedNumbers(MOCK_POOL_NUMBERS);
    const server = createMcpServer(getOrCreateDemoUser);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
  });
  afterAll(async () => {
    await client.close();
    config.MOCK_PROVIDERS = false;
  });

  it('exposes the seven RingTask tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'check_balance', 'get_call_result', 'get_messages', 'get_number', 'make_voice_call', 'release_number', 'send_sms',
    ]);
  });

  it('runs the SMS flow: lease, send, read, release', async () => {
    const number = await call('get_number', { duration_hours: 1 });
    expect(number.isError).toBe(false);
    expect(MOCK_POOL_NUMBERS).toContain(number.data.phoneNumber);

    const sent = await call('send_sms', { number_id: number.data.numberId, to: '+15557654321', message: 'Reminder: dentist at 3pm' });
    expect(sent.data).toMatchObject({ status: 'mock-sent', mock: true });

    const { data } = await call('get_messages', { number_id: number.data.numberId });
    expect(data.messages.map((m: { direction: string }) => m.direction).sort()).toEqual(['in', 'out']);
    expect(data.messages.find((m: { direction: string }) => m.direction === 'in').body).toContain('[mock auto-reply]');

    expect((await call('check_balance')).data.credits).toBe(99);
    expect((await call('release_number', { number_id: number.data.numberId })).data).toEqual({ success: true });
    expect((await call('get_messages', { number_id: number.data.numberId })).isError).toBe(true);
  });

  it('runs a voice mission and labels the result as mock', async () => {
    const started = await call('make_voice_call', { to: '+15557654321', mission: 'Confirm Tuesday 10am appointment', caller_name: 'Dr. Lee\'s office' });
    expect(started.data).toMatchObject({ status: 'in-progress', mock: true });

    const first = await call('get_call_result', { call_id: started.data.callId });
    expect(first.data.status).toBe('in-progress');

    const done = await call('get_call_result', { call_id: started.data.callId });
    expect(done.data).toMatchObject({ status: 'completed', mock: true, durationSeconds: 42, creditsUsed: 5 });
    expect(done.data.transcript).toContain('MOCK TRANSCRIPT');
    expect(done.data.missionAccomplished).toBeUndefined();
  });

  it('returns isError results instead of throwing', async () => {
    expect((await call('send_sms', { number_id: 'nope', to: '+15557654321', message: 'x' })).isError).toBe(true);
    expect((await call('get_call_result', { call_id: 'nope' })).data.error).toBe('Call not found');
  });
});
