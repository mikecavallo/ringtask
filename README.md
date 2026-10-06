# RingTask

**An MCP server and REST API that gives AI agents phone numbers, SMS, and AI voice calls.**

RingTask lets an AI agent lease a phone number, text customers, read replies, and hand a phone call
to an AI voice agent with a plain-English goal ("book a cleaning for Friday afternoon"), then read back
the transcript and summary. It is aimed at legitimate business tasks such as appointment booking,
reminders, and customer callbacks, and runs on your own Twilio and Retell accounts.

Status: open-source prototype. See [Status](#status) for exactly what works.

![RingTask landing page](docs/landing-hero.png)

Landing page: <https://mikecavallo.github.io/ringtask/> (source in [`web/`](web/))

## What it does

- **Phone numbers**: a pool of numbers you own in Twilio. Agents lease one for a set time; leases
  expire automatically and numbers cool down before reuse. Only the holder can use or release a number.
- **SMS**: send from a leased number, receive replies through a Twilio webhook, list the conversation.
- **AI voice calls**: start an outbound call through a [Retell](https://www.retellai.com/) voice agent
  with a mission, caller name, style, and context. The agent opens by saying it is an AI assistant.
  Results (status, transcript, summary, recording URL) are refreshed from the Retell API via webhook
  or polling.
- **Credits**: 1 credit per SMS, 5 credits per started call minute. New users start with 100 credits.
  Credits can be bought with Stripe Checkout (Solana payments are experimental).
- **Mock mode**: `RINGTASK_MOCK=1` swaps Twilio and Retell for in-process mocks so the whole thing
  can be demoed with no accounts. Every mocked response carries `"mock": true`.

## Architecture

```
 MCP client (Claude Desktop, Claude Code, ...)        HTTP client (X-API-Key)
            |  stdio                                          |
            v                                                 v
   src/mcp-server.ts  --> src/mcp/tools.ts          src/api/routes.ts (Fastify)
            \                                                 /
             +----------------> src/services/ <--------------+
                  auth (API keys, credits)    number-pool (lease, expiry, cooldown)
                  sms (send, inbound, list)   voice (missions, billing, webhooks)
                  payments-stripe             payments-solana (experimental)
                               |                       |
                       src/db (Drizzle + SQLite)   src/providers/
                                                     twilio.ts  -> Twilio SMS API
                                                     retell.ts  -> Retell voice API
                                                     mock.ts    -> local mocks (RINGTASK_MOCK=1)

 Inbound webhooks:  Twilio SMS  -> POST /api/webhooks/sms     (X-Twilio-Signature checked)
                    Retell      -> POST /api/webhooks/retell  (call state re-fetched from Retell)
                    Stripe      -> POST /api/webhooks/stripe  (signature checked, events de-duplicated)
```

## MCP tools

| Tool | Arguments | Returns |
|------|-----------|---------|
| `get_number` | `duration_hours?` | `numberId`, `phoneNumber`, `expiresAt` |
| `send_sms` | `number_id`, `to` (E.164), `message` | `messageId`, `status`, `mock` |
| `get_messages` | `number_id` | `messages[]`, newest first |
| `release_number` | `number_id` | `success` |
| `check_balance` | none | `credits` |
| `make_voice_call` | `to`, `mission`, `caller_name?`, `style?`, `context?` | `callId`, `status`, `fromNumber`, `mock` |
| `get_call_result` | `call_id` | `status`, `transcript`, `summary`, `recordingUrl`, `durationSeconds`, `creditsUsed`, `mock` |

Errors come back as tool results with `isError: true` and `{ "error": "..." }`.

### Example session (mock mode)

The output below is from a real run with `RINGTASK_MOCK=1` (IDs shortened):

```text
get_number({ "duration_hours": 2 })
-> { "numberId": "9a87d2a4-...", "phoneNumber": "+15550100001", "expiresAt": "2026-10-06T12:48:54.024Z" }

send_sms({ "number_id": "9a87d2a4-...", "to": "+15557654321", "message": "Reminder: dentist Tuesday 10am" })
-> { "messageId": "cdc2295f-...", "status": "mock-sent", "mock": true }

make_voice_call({ "to": "+15557654321", "mission": "Confirm appointment", "caller_name": "Dr. Lee's office" })
-> { "callId": "f418bcfb-...", "status": "in-progress", "fromNumber": "+15550100001", "mock": true }

get_call_result({ "call_id": "f418bcfb-..." })      // first poll
-> { "status": "in-progress", ... , "mock": true }

get_call_result({ "call_id": "f418bcfb-..." })      // second poll
-> { "status": "completed", "durationSeconds": 42, "creditsUsed": 5,
     "transcript": "[MOCK TRANSCRIPT: no real call was placed] ...",
     "summary": "Mock mode: the call was simulated locally. Configure Retell to place real calls.",
     "mock": true }
```

In mock mode a sent SMS also produces an inbound `[mock auto-reply]` message so `get_messages` shows
both directions. The mock never reports that a mission succeeded.

### Connecting an MCP client

Build once, then point your client at `dist/mcp-server.js`. Claude Desktop (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ringtask": {
      "command": "node",
      "args": ["/absolute/path/to/ringtask/dist/mcp-server.js"],
      "env": {
        "RINGTASK_MOCK": "1",
        "DATABASE_URL": "/absolute/path/to/ringtask/ringtask.db"
      }
    }
  }
}
```

Claude Code:

```bash
claude mcp add ringtask --env RINGTASK_MOCK=1 -- node /absolute/path/to/ringtask/dist/mcp-server.js
```

For real providers, drop `RINGTASK_MOCK`, set `RINGTASK_API_KEY` to a key from
`POST /api/auth/register`, and give the MCP server the same `.env`/database as the API server.

## Setup

Requires Node.js 20+ (CI uses 22).

```bash
npm ci
cp .env.example .env

# Demo without any accounts
npm run dev:mock          # REST API on :3210 with mock providers
npm run mcp:mock          # MCP server over stdio with mock providers

# Real providers (fill in .env first)
npm run dev               # REST API
npm run mcp               # MCP server
```

Production: `npm run build && npm start` (API) and `npm run mcp:start` (MCP server).

### Real-provider checklist

1. Buy numbers in Twilio and list them in `TWILIO_PHONE_NUMBERS`.
2. Point each number's SMS webhook at `https://<BASE_URL>/api/webhooks/sms` and set `BASE_URL`
   to the exact public URL so signatures validate.
3. Import the same numbers into Retell (outbound calls must come from a Retell-registered number).
4. Set `RETELL_API_KEY` and `ADMIN_API_KEY`, then create the agent once:
   `curl -X POST https://<BASE_URL>/api/admin/create-agent -H "x-admin-key: $ADMIN_API_KEY"`
   and put the returned ID in `RETELL_AGENT_ID`. Set `RETELL_WEBHOOK_URL` to
   `https://<BASE_URL>/api/webhooks/retell` (before creating the agent) to get push updates;
   otherwise results are fetched when you poll.
5. For Stripe, set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`, and send
   `checkout.session.completed` events to `https://<BASE_URL>/api/webhooks/stripe`.

### REST API

All routes except registration, webhooks, health, and package listing need `X-API-Key`.

| Method & path | Purpose |
|---------------|---------|
| `POST /api/auth/register` `{ email }` | Create a user, returns `apiKey` |
| `GET /api/numbers` / `POST /api/numbers/assign` / `DELETE /api/numbers/:id` | List, lease, release numbers |
| `POST /api/sms/send` `{ number_id, to, message }` / `GET /api/messages/:numberId` | SMS |
| `POST /api/calls` `{ to, mission, caller_name?, style?, context? }` / `GET /api/calls/:id` | Voice calls |
| `GET /api/balance`, `GET /api/credits/packages` | Credits |
| `POST /api/credits/buy/stripe` `{ packageId, successUrl, cancelUrl }` | Stripe Checkout session |
| `POST /api/credits/buy/solana`, `GET /api/credits/solana/status/:paymentId` | Solana (experimental) |
| `GET /api/health` | Liveness, reports whether mock mode is on |

## Environment variables

See [`.env.example`](.env.example) for the full list.

| Variable | Purpose |
|----------|---------|
| `RINGTASK_MOCK` | `1` to use local mock providers instead of Twilio and Retell |
| `API_PORT`, `DATABASE_URL`, `BASE_URL` | Server port, SQLite file, public URL (for Twilio signature checks) |
| `ADMIN_API_KEY` | Enables `POST /api/admin/create-agent`; disabled when empty |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBERS` | Twilio credentials and the number pool |
| `TWILIO_VALIDATE_WEBHOOKS` | Signature check on inbound SMS (default `true`) |
| `RETELL_API_KEY`, `RETELL_AGENT_ID`, `RETELL_WEBHOOK_URL` | Retell voice agent |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe Checkout and webhook verification |
| `SOLANA_RPC_URL`, `SOLANA_TREASURY_ADDRESS`, `SOL_PRICE_USD` | Experimental SOL payments |
| `DEFAULT_ASSIGN_HOURS`, `MAX_ASSIGN_HOURS`, `COOLDOWN_HOURS`, `NEW_USER_CREDITS` | Pool and credit tuning |
| `RINGTASK_API_KEY` | User the MCP server acts as (optional in mock mode) |

## Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` / `npm run dev:mock` | API server with tsx (real / mock providers) |
| `npm run mcp` / `npm run mcp:mock` | MCP server over stdio (real / mock providers) |
| `npm run build` / `npm start` / `npm run mcp:start` | Compile to `dist/` and run |
| `npm run typecheck` | Type-check source and tests |
| `npm test` | Vitest suite (no network, no credentials) |
| `cd web && npm run build` | Build the landing page |

## Tests

`npm test` runs 33 tests against an in-memory SQLite database with Twilio, Retell (HTTP), and Stripe
mocked. They cover the number pool (leasing, ownership, expiry, cooldown), API-key auth and credit
deduction, SMS sending and inbound webhook signature checks, the Retell call flow and billing,
all seven MCP tools over an in-memory MCP transport, Stripe webhook signature verification and
de-duplication, and Solana payment verification. CI runs type-check, build, and tests for the
server and type-check, lint, and build for the landing page.

## Status

Implemented and tested with mocks:

- REST API and MCP server (7 tools), API-key auth, credit accounting
- Number pool with ownership, expiry, and cooldown
- Twilio SMS send and inbound webhook with signature validation
- Retell voice calls: start, refresh via webhook or polling, transcript and summary, per-minute billing
- Stripe Checkout with verified, idempotent webhooks
- Mock provider mode

Limitations and in progress:

- Not yet verified end to end against live Twilio and Retell accounts; the Retell agent setup
  helper (`/api/admin/create-agent`) in particular should be checked against the current Retell API.
- No hosted service. You run it with your own provider accounts and pay them directly.
- Solana payments are experimental: pending payments live in memory and are lost on restart,
  and the SOL price is a fixed config value.
- No rate limiting or per-number abuse controls beyond credits. Registration is open and grants
  starter credits; restrict it before exposing the API publicly.
- Inbound calls are not handled. Numbers are US-centric (E.164 is validated, but nothing else is).
- SQLite with `CREATE TABLE IF NOT EXISTS` bootstrap; no formal migrations yet.

## License

No license file has been added yet, so all rights are reserved by the author by default.
