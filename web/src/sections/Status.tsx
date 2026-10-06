const working = [
  'REST API and MCP server (7 tools) with API-key auth',
  'Number pool: lease, ownership checks, expiry, cooldown',
  'Outbound and inbound SMS via Twilio, with webhook signature checks',
  'AI voice calls via Retell: start, webhook or polling, transcript, summary, per-minute billing',
  'Credits: Stripe Checkout with verified, de-duplicated webhooks',
  'Mock provider mode for local demos without credentials',
  'Automated tests for pool, auth, SMS, voice, MCP tools, and Stripe webhooks',
];

const inProgress = [
  'Not yet run against live Twilio and Retell accounts end to end',
  'No hosted service: you run it yourself with your own provider accounts',
  'Solana payments are experimental (pending payments are kept in memory)',
  'No rate limiting or abuse controls beyond credits yet',
];

export default function Status() {
  return (
    <section id="status" className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="font-heading font-bold text-4xl md:text-5xl text-center mb-4">
          Project <span className="text-orange glow-orange">Status</span>
        </h2>
        <p className="text-white/40 text-center mb-16 text-lg">An open-source prototype. Here is what works today and what does not.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-8 rounded-2xl border border-cyan/10 bg-white/[0.02]">
            <h3 className="font-heading font-bold text-xl text-white mb-6">Implemented</h3>
            <ul className="space-y-3">
              {working.map((w) => (
                <li key={w} className="flex items-start gap-3 text-white/50 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-cyan" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
          <div className="p-8 rounded-2xl border border-orange/10 bg-white/[0.02]">
            <h3 className="font-heading font-bold text-xl text-white mb-6">Limitations and in progress</h3>
            <ul className="space-y-3">
              {inProgress.map((w) => (
                <li key={w} className="flex items-start gap-3 text-white/50 text-sm">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-orange" />
                  {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="text-center text-white/30 text-sm mt-10">
          Credits: 1 per SMS, 5 per started call minute. Providers (Twilio, Retell, Stripe) bill your own accounts directly.
        </p>
      </div>
    </section>
  );
}
