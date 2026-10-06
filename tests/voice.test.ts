import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { config } from '../src/config.js';
import { buildApp } from '../src/app.js';
import { mapRetellStatus } from '../src/providers/retell.js';
import { startMission, getCallResult } from '../src/services/voice.js';
import { createUser, credits, resetDb, seedPool } from './helpers.js';

// Stub global fetch so the Retell provider never reaches the network.
function retellFetch(handlers: { create?: () => unknown; get?: () => unknown }) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const body = url.includes('/v2/create-phone-call') ? handlers.create?.() : handlers.get?.();
    if (body instanceof Error) return new Response(body.message, { status: 500 });
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  });
}

describe('voice missions via Retell (mocked HTTP)', () => {
  beforeEach(async () => {
    resetDb();
    config.MOCK_PROVIDERS = false;
    config.RETELL_API_KEY = 'key_test';
    config.RETELL_AGENT_ID = 'agent_test';
    await seedPool(1);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('maps Retell statuses onto RingTask statuses', () => {
    expect(mapRetellStatus('registered')).toBe('in-progress');
    expect(mapRetellStatus('ongoing')).toBe('in-progress');
    expect(mapRetellStatus('ended')).toBe('completed');
    expect(mapRetellStatus('error')).toBe('failed');
    expect(mapRetellStatus('not_connected', 'dial_failed')).toBe('failed');
  });

  it('refuses to start when Retell is not configured', async () => {
    config.RETELL_API_KEY = '';
    const user = await createUser();
    await expect(startMission({ userId: user.id, toNumber: '+15557654321', missionText: 'x' }))
      .rejects.toThrow('Voice calling is not configured');
  });

  it('creates the call with mission variables, then bills on completion from the webhook', async () => {
    const fetchMock = retellFetch({
      create: () => ({ call_id: 'rc_1', call_status: 'registered' }),
      get: () => ({
        call_id: 'rc_1', call_status: 'ended', duration_ms: 95_000, transcript: 'Agent: Hi...',
        call_analysis: { call_summary: 'Booked for Friday 3pm', custom_analysis_data: { mission_accomplished: true } },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const user = await createUser();

    const started = await startMission({
      userId: user.id, toNumber: '+15557654321', missionText: 'Book a cleaning for Friday afternoon', callerName: 'Dana',
    });
    expect(started).toMatchObject({ status: 'in-progress', mock: false });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.retellai.com/v2/create-phone-call');
    const sent = JSON.parse(init!.body as string);
    expect(sent).toMatchObject({
      to_number: '+15557654321',
      override_agent_id: 'agent_test',
      retell_llm_dynamic_variables: { mission: 'Book a cleaning for Friday afternoon', caller_name: 'Dana' },
      metadata: { ringtask_call_id: started.callId },
    });

    const app = await buildApp();
    const hook = await app.inject({ method: 'POST', url: '/api/webhooks/retell', payload: { event: 'call_ended', call: { call_id: 'rc_1' } } });
    expect(hook.json()).toMatchObject({ received: true, updated: true });
    await app.close();

    const result = await getCallResult(user.id, started.callId);
    expect(result).toMatchObject({ status: 'completed', durationSeconds: 95, creditsUsed: 10, summary: 'Booked for Friday 3pm', mock: false });
    expect(await credits(user.id)).toBe(90);

    // A redelivered webhook must not bill twice.
    const app2 = await buildApp();
    await app2.inject({ method: 'POST', url: '/api/webhooks/retell', payload: { event: 'call_analyzed', call: { call_id: 'rc_1' } } });
    await app2.close();
    expect(await credits(user.id)).toBe(90);
  });

  it('ignores webhooks for unknown call IDs (forged payloads)', async () => {
    const fetchMock = retellFetch({});
    vi.stubGlobal('fetch', fetchMock);
    const app = await buildApp();
    const res = await app.inject({ method: 'POST', url: '/api/webhooks/retell', payload: { event: 'call_ended', call: { call_id: 'rc_unknown', duration_ms: 1 } } });
    expect(res.json()).toMatchObject({ updated: false });
    expect(fetchMock).not.toHaveBeenCalled();
    await app.close();
  });

  it('marks the call failed and surfaces the error when Retell rejects it', async () => {
    vi.stubGlobal('fetch', retellFetch({ create: () => new Error('from_number not imported') }));
    const user = await createUser();
    await expect(startMission({ userId: user.id, toNumber: '+15557654321', missionText: 'Call back about order' }))
      .rejects.toThrow('Retell API error (500)');
  });

  it('only returns calls to the user who placed them', async () => {
    vi.stubGlobal('fetch', retellFetch({ create: () => ({ call_id: 'rc_2', call_status: 'registered' }), get: () => new Error('down') }));
    const owner = await createUser();
    const other = await createUser();
    const { callId } = await startMission({ userId: owner.id, toNumber: '+15557654321', missionText: 'x' });
    expect(await getCallResult(other.id, callId)).toBeNull();
    expect(await getCallResult(owner.id, callId)).toMatchObject({ status: 'in-progress' });
  });
});
