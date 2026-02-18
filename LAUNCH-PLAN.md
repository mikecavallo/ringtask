# 3-Day Launch Plan

**Ship date: Wednesday Feb 18, 2026**

## Reframe: Not "temp numbers" — AI Phone Agents on Demand

Two products, one platform:
1. **SMS Tools** (MCP) — agents get numbers, send/receive texts, verify accounts
2. **Voice Missions** (MCP + Web) — give an AI a goal + phone number, it makes the call and reports back

## Day 1 (Sun Feb 15-16): Foundation

### Morning: Infrastructure
- [ ] Set up Twilio account with 50 numbers (US, mix of area codes)
- [ ] Build number pool manager (assign, recycle, cooldown tracking)
- [ ] Node.js API server (Express or Fastify)
- [ ] Database: SQLite for MVP (numbers, assignments, usage, call logs)

### Afternoon: SMS Core
- [ ] Twilio SMS webhooks (inbound/outbound)
- [ ] MCP server with tools: `get_number`, `send_sms`, `get_messages`, `release_number`
- [ ] Number assignment logic (pick from pool, track active assignments, auto-expire)
- [ ] Basic rate limiting

### Evening: Auth + Payments
- [ ] Stripe integration (simple checkout for credits)
- [ ] API key auth system (sign up → get API key → use MCP)
- [ ] Credit system: buy credits, deduct per action

## Day 2 (Mon Feb 17): Voice + Polish

### Morning: Voice Agent
- [ ] Voice call engine — Twilio Voice + OpenAI/Anthropic for conversation
- [ ] Mission system: accept goal text + target number → agent calls → returns transcript
- [ ] MCP tool: `make_voice_call(to, mission, style?)` 
- [ ] Call recording + transcription (for user to review)

### Afternoon: Web Interface
- [ ] Landing page (Next.js or static) — explains the product, sign up
- [ ] Dashboard: see your numbers, messages, call transcripts
- [ ] "Try it now" — enter a number + mission, hear a sample call
- [ ] Pricing page

### Evening: Testing
- [ ] End-to-end SMS flow testing
- [ ] Voice call testing (various mission types)
- [ ] MCP client testing (does it work in Claude Desktop, OpenClaw, etc.)
- [ ] Edge cases: busy signals, voicemail, no answer

## Day 3 (Tue Feb 18): Launch

### Morning: Deploy
- [ ] Deploy API to VPS/Railway/Fly.io
- [ ] Domain + SSL
- [ ] Monitoring + error alerting
- [ ] Twilio webhook URLs pointing to production

### Afternoon: Launch
- [ ] Post on Moltbook
- [ ] Post MCP server to ClawHub
- [ ] Tweet / social media
- [ ] README with quick start guide

## Tech Stack

| Component | Tech |
|-----------|------|
| API Server | Node.js + Fastify |
| Database | SQLite (Drizzle ORM) |
| Phone | Twilio (numbers, SMS, voice) |
| Voice AI | Twilio Media Streams + Claude/GPT for conversation |
| MCP Server | @modelcontextprotocol/sdk |
| Web | Next.js (Vercel) |
| Payments | Stripe |
| Auth | API keys (JWT later) |

## Pricing (Launch)

| Action | Cost |
|--------|------|
| Get a number (24h) | 1 credit |
| Send SMS | 1 credit |
| Receive SMS | Free |
| Voice call (per min) | 3 credits |
| 10 credits | $1 |
| 50 credits | $4 |
| 200 credits | $12 |

Solana payments: Phase 2 (post-launch)

## MVP Scope (What we CUT)

- ❌ Crypto payments (Stripe only for now)
- ❌ Monthly subscriptions (credits only)
- ❌ International numbers (US only)
- ❌ Inbound voice calls (outbound only)
- ❌ Number porting
- ❌ Fancy anti-abuse (basic rate limits only)

## What Makes This Work

1. **MCP-first** — no one else has this
2. **Voice missions** — the viral hook
3. **Dead simple** — get a number in one tool call
4. **Credits** — no subscriptions, pay for what you use
5. **Fast** — 3 days to market, iterate from there
