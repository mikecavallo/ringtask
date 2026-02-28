import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { initDatabase } from './db/index.js';
import { assignNumber, releaseNumber } from './services/number-pool.js';
import { sendSms, getMessages } from './services/sms.js';
import { initiateMission, getCallResult } from './services/voice-mission.js';
import { getUserByApiKey } from './services/auth.js';

// MCP user context — in a real setup, the API key would come from MCP auth
const MCP_USER_ID = process.env.MCP_USER_ID || 'mcp-default-user';

const server = new McpServer({
  name: 'ringtask',
  version: '0.1.0',
});

server.tool(
  'get_number',
  'Get a temporary phone number from the pool',
  { duration_hours: z.number().optional().describe('How many hours to hold the number (default: 4)') },
  async ({ duration_hours }) => {
    try {
      const result = await assignNumber(MCP_USER_ID, duration_hours);
      return {
        content: [{ type: 'text', text: JSON.stringify(result) }],
      };
    } catch (err: any) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  }
);

server.tool(
  'send_sms',
  'Send an SMS from an assigned number',
  {
    number_id: z.string().describe('ID of the assigned number'),
    to: z.string().describe('Destination phone number'),
    message: z.string().describe('Message body'),
  },
  async ({ number_id, to, message }) => {
    try {
      const result = await sendSms(number_id, to, message);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  }
);

server.tool(
  'get_messages',
  'Get messages for an assigned number',
  { number_id: z.string().describe('ID of the assigned number') },
  async ({ number_id }) => {
    const msgs = await getMessages(number_id);
    return { content: [{ type: 'text', text: JSON.stringify({ messages: msgs }) }] };
  }
);

server.tool(
  'release_number',
  'Release an assigned number back to the pool',
  { number_id: z.string().describe('ID of the number to release') },
  async ({ number_id }) => {
    await releaseNumber(number_id);
    return { content: [{ type: 'text', text: JSON.stringify({ success: true }) }] };
  }
);

server.tool(
  'check_balance',
  'Check your credit balance',
  {},
  async () => {
    const { getUserById } = await import('./services/auth.js');
    const user = await getUserById(MCP_USER_ID);
    return {
      content: [{ type: 'text', text: JSON.stringify({ credits: user?.credits ?? 0 }) }],
    };
  }
);

server.tool(
  'make_voice_call',
  'Initiate a voice mission — an AI calls a number with a goal',
  {
    to: z.string().describe('Phone number to call'),
    mission: z.string().describe('What the AI should accomplish on the call'),
    style: z.string().optional().describe('Voice/personality style'),
  },
  async ({ to, mission, style }) => {
    try {
      const result = await initiateMission({
        userId: MCP_USER_ID,
        toNumber: to,
        missionText: mission,
        style,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (err: any) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }], isError: true };
    }
  }
);

server.tool(
  'get_call_result',
  'Get the result of a voice mission',
  { call_id: z.string().describe('ID of the call') },
  async ({ call_id }) => {
    const result = await getCallResult(call_id);
    if (!result) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: 'Call not found' }) }], isError: true };
    }
    return { content: [{ type: 'text', text: JSON.stringify(result) }] };
  }
);

async function main() {
  initDatabase();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
