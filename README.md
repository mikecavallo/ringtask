# PhantomNumber (working title)

**Temp phone numbers as a service — built for AI agents, usable by humans.**

MCP-first API that lets AI agents get a phone number, send/receive SMS, and make voice calls — paid in SOL or Stripe.

## The Idea

AI agents increasingly need to:
- Verify accounts (receive SMS OTP codes)
- Send texts to humans (notifications, outreach)
- Make/receive voice calls
- Have a persistent-ish phone identity

Today they can't do this without a human setting up Twilio, buying numbers, writing integration code. We abstract all of that behind MCP tools.

## Pricing Tiers (Draft)

| Tier | Price | What You Get |
|------|-------|-------------|
| **Verification** | $0.25-0.50 per use | Disposable number, receive 1 SMS, auto-expires in 10 min |
| **Burner** | $1/number | Number lives 24h, unlimited SMS in/out |
| **Monthly** | $5-10/mo | Dedicated number, X mins voice + Y texts |
| **Pay-as-you-go** | Per message/minute | For agents that need flexibility |

Payment: Solana (SOL/USDC) or Stripe. Crypto-native agents can auth with wallet signature.

## MCP Tools

```
get_number(type: "verification"|"burner"|"monthly", country?: string)
send_sms(number_id: string, to: string, message: string)
receive_sms(number_id: string) → messages[]
make_call(number_id: string, to: string, script?: string)
receive_call(number_id: string) → call details
release_number(number_id: string)
check_balance() → credits remaining
```

## Competitive Landscape

### Direct Competitors (Human-focused)
- **Burner App** — Second phone number app for privacy. Consumer-focused, no API, no agent support. ~$5/mo per line.
- **TextNow** — Free phone service with ads. Consumer app, no API.
- **Google Voice** — Free number, but requires Google account, no API for agents.

### SMS Verification Services (Grey market)
- **SMSPool** — Pay-per-verification, API available. $0.10-2.00 per SMS depending on service. Popular with botters.
- **5sim.net** — Similar to SMSPool. Virtual numbers for verification.
- **receive-sms.co** — Free public numbers, shared inbox (anyone can see your codes). Useless for real accounts.

### Infrastructure (Build-it-yourself)
- **Twilio** — The gorilla. Full API, but you need to build everything. $1/mo per number + per-message/minute costs.
- **Vonage/Nexmo** — Similar to Twilio.
- **Telnyx** — Cheaper Twilio alternative.
- **Plivo** — Same category.

### What's Missing (Our Gap)
**Nobody is doing MCP-native phone numbers for AI agents.** The market breaks down as:
- Consumer apps (Burner, TextNow) → no API, human-only
- Grey market verification (SMSPool, 5sim) → sketchy, verification-only, no voice
- Infrastructure (Twilio) → too complex, agents can't self-serve

**We sit in the middle:** Agent-friendly API (MCP), self-service (pay with crypto), full featured (SMS + voice), with proper number management.

## Key Differentiators

1. **MCP-first** — Any AI agent framework can use it natively
2. **Crypto payments** — Agents can pay without human credit cards (SOL, USDC)
3. **Self-service for agents** — No human setup required, agent provisions its own number
4. **Voice + SMS** — Not just verification, full communication
5. **Agent identity** — Persistent numbers for agents that need ongoing phone presence

## Risks & Challenges

- **Number blocking** — Major services (Google, Meta, banks) actively block VoIP/virtual numbers. This is THE challenge.
- **Abuse** — Will attract fraudsters. Need strong anti-abuse: rate limiting, service blocklists, reputation scoring.
- **Regulatory** — Telecom regulations vary by country. US has TCPA, A2P 10DLC requirements.
- **Margin pressure** — Underlying costs (Twilio/Telnyx) eat into margins on cheap tiers.
- **Trust** — Agents paying with crypto for temp numbers screams "fraud" to carriers.

## Architecture (High Level)

```
AI Agent → MCP Server → PhantomNumber API → Number Pool Manager → Twilio/Telnyx
                                           → Payment (Solana / Stripe)
                                           → Anti-abuse Engine
```

## Market Fit Assessment

**Strong fit because:**
- AI agents are exploding in number, many need phone verification
- No MCP-native solution exists
- Crypto payment is natural for autonomous agents
- The "agent economy" is forming (Moltverr, etc.)

**Weak fit because:**
- Services are actively fighting virtual numbers
- Regulatory complexity is real
- The grey market already serves the verification use case cheaply

## Next Steps

- [ ] Validate: Can Telnyx/Twilio numbers actually pass major service verifications?
- [ ] Prototype MCP server with basic get_number + receive_sms
- [ ] Design anti-abuse system
- [ ] Solana payment integration (SPL token or SOL)
- [ ] Landing page
- [ ] Name (PhantomNumber? AgentLine? GhostDial?)

---

*Created: 2026-02-15*
