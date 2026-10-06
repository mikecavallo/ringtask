import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { User } from '../services/auth.js';
import { getUserById } from '../services/auth.js';
import { assignNumber, releaseNumber } from '../services/number-pool.js';
import { sendSms, getMessages } from '../services/sms.js';
import { startMission, getCallResult } from '../services/voice.js';

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

const ok = (data: unknown): ToolResult => ({ content: [{ type: 'text', text: JSON.stringify(data) }] });
const fail = (err: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify({ error: err instanceof Error ? err.message : String(err) }) }],
  isError: true,
});

/**
 * Register RingTask's MCP tools. `resolveUser` returns the RingTask user every tool
 * call acts on behalf of (from RINGTASK_API_KEY, or the local demo user in mock mode).
 */
export function registerTools(server: McpServer, resolveUser: () => Promise<User>) {
  const guard = (fn: (user: User) => Promise<unknown>) => async (): Promise<ToolResult> => {
    try {
      return ok(await fn(await resolveUser()));
    } catch (err) {
      return fail(err);
    }
  };

  server.tool(
    'get_number',
    'Lease a phone number from the RingTask pool for sending and receiving SMS.',
    { duration_hours: z.number().positive().optional().describe('How many hours to hold the number (default: 4)') },
    async ({ duration_hours }) => guard((u) => assignNumber(u.id, duration_hours))(),
  );

  server.tool(
    'send_sms',
    'Send an SMS from a number you hold. Costs 1 credit.',
    {
      number_id: z.string().describe('numberId returned by get_number'),
      to: z.string().describe('Destination in E.164 format, e.g. +15551234567'),
      message: z.string().describe('Message body'),
    },
    async ({ number_id, to, message }) => guard((u) => sendSms(u.id, number_id, to, message))(),
  );

  server.tool(
    'get_messages',
    'List recent inbound and outbound SMS for a number you hold (newest first).',
    { number_id: z.string().describe('numberId returned by get_number') },
    async ({ number_id }) => guard(async (u) => ({ messages: await getMessages(u.id, number_id) }))(),
  );

  server.tool(
    'release_number',
    'Release a number you hold back to the pool.',
    { number_id: z.string().describe('numberId returned by get_number') },
    async ({ number_id }) => guard(async (u) => {
      await releaseNumber(u.id, number_id);
      return { success: true };
    })(),
  );

  server.tool(
    'check_balance',
    'Check your remaining RingTask credits.',
    {},
    async () => guard(async (u) => ({ credits: (await getUserById(u.id))?.credits ?? 0 }))(),
  );

  server.tool(
    'make_voice_call',
    'Have an AI voice agent (Retell) call a number to accomplish a stated goal, such as booking an appointment or returning a customer call. Returns a call_id; poll get_call_result for the outcome. Billed 5 credits per started minute.',
    {
      to: z.string().describe('Number to call, E.164 format'),
      mission: z.string().describe('What the agent should accomplish on the call'),
      caller_name: z.string().optional().describe('Person or business the agent is calling on behalf of'),
      style: z.string().optional().describe('Tone: professional, friendly, casual, firm, empathetic'),
      context: z.string().optional().describe('Extra facts the agent may use (callback number, account name, ...)'),
    },
    async ({ to, mission, caller_name, style, context }) => guard((u) => startMission({
      userId: u.id, toNumber: to, missionText: mission, callerName: caller_name, style, context,
    }))(),
  );

  server.tool(
    'get_call_result',
    'Get status, transcript, and summary of a call started with make_voice_call.',
    { call_id: z.string().describe('callId returned by make_voice_call') },
    async ({ call_id }) => guard(async (u) => {
      const result = await getCallResult(u.id, call_id);
      if (!result) throw new Error('Call not found');
      return result;
    })(),
  );
}

export function createMcpServer(resolveUser: () => Promise<User>): McpServer {
  const server = new McpServer({ name: 'ringtask', version: '0.2.0' });
  registerTools(server, resolveUser);
  return server;
}
